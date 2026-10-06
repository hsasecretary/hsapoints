<#
Deterministic ticket loop. The script owns control flow; claude only works inside one ticket.

  .\tools\loop\loop.ps1 -Parent 104 -Base feat/closet -Only 106     # pilot on one ticket
  .\tools\loop\loop.ps1 -Parent 104 -Base feat/closet -Max 3        # up to 3 tickets
  .\tools\loop\loop.ps1 -Parent 104 -Base feat/closet -DryRun       # just list the frontier

Per ticket: claim -> worktree off origin/<Base> -> fresh `claude -p` -> typecheck/test gate
(plus emulator tests when the ticket mentions them) -> push -> PR into <Base>. Never touches
main, never merges, never enables auto-merge. Merge the PR, and the next run closes the ticket.
#>
param(
    [Parameter(Mandatory)] [int] $Parent,
    [Parameter(Mandatory)] [string] $Base,
    [int] $Only = 0,
    [int] $Max = 1,
    [int] $Retries = 1,
    [int] $MaxTurns = 80,
    [string] $Label = 'ready-for-agent',
    [switch] $DryRun
)

$ErrorActionPreference = 'Stop'
$root = (git rev-parse --show-toplevel).Trim()
Set-Location $root
$tmp = Join-Path $env:TEMP "hsa-loop"
New-Item -ItemType Directory -Force $tmp | Out-Null
$repo = (gh repo view --json nameWithOwner --jq .nameWithOwner).Trim()

function Say($m) { Write-Host "[loop] $m" }

function Stop-Emulator {
    Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

function Get-Children {
    $raw = gh api "repos/$repo/issues/$Parent/sub_issues" --paginate --jq '.[] | {number, state}' | ForEach-Object { $_ | ConvertFrom-Json }
    return @($raw)
}

# Close tickets whose PR into $Base has been merged (merging into a non-default branch does not auto-close).
function Close-Merged {
    foreach ($c in Get-Children) {
        if ($c.state -ne 'open') { continue }
        $merged = gh pr list --repo $repo --head "loop/$($c.number)" --base $Base --state merged --json number --jq 'length'
        if ([int]$merged -gt 0) {
            Say "closing #$($c.number): its PR is merged"
            if (-not $DryRun) { gh issue close $c.number --repo $repo --comment "Merged into $Base." | Out-Null }
        }
    }
}

# Open children, labelled, unassigned, with no open blockers, in ticket order.
function Get-Frontier {
    $out = @()
    foreach ($c in (Get-Children | Where-Object { $_.state -eq 'open' } | Sort-Object number)) {
        $i = gh api "repos/$repo/issues/$($c.number)" | ConvertFrom-Json
        $labels = @($i.labels | ForEach-Object { $_.name })
        $blocked = [int]$i.issue_dependencies_summary.blocked_by
        if ($labels -contains $Label -and $i.assignees.Count -eq 0 -and $blocked -eq 0) {
            if ($Only -eq 0 -or $Only -eq $c.number) { $out += $i }
        }
    }
    return $out
}

function Invoke-Gate($frontend, $needsEmulator) {
    Push-Location $frontend
    try {
        $log = Join-Path $tmp "gate.log"
        "" | Set-Content $log
        $steps = @('typecheck', 'test')
        if ($needsEmulator) { $steps += 'test:emulator' }
        foreach ($s in $steps) {
            if ($s -eq 'test:emulator') { Stop-Emulator }
            Say "gate: npm run $s"
            cmd /c "npm run $s >> `"$log`" 2>&1"
            $code = $LASTEXITCODE
            if ($s -eq 'test:emulator') { Stop-Emulator }
            if ($code -ne 0) {
                return @{ ok = $false; step = $s; tail = ((Get-Content $log -Tail 60) -join "`n") }
            }
        }
        return @{ ok = $true }
    }
    finally { Pop-Location }
}

Close-Merged
$frontier = Get-Frontier
if ($frontier.Count -eq 0) { Say "frontier is empty: nothing to do"; exit 0 }
Say ("frontier: " + (($frontier | ForEach-Object { "#$($_.number) $($_.title)" }) -join "; "))
if ($DryRun) { exit 0 }

git fetch origin $Base --quiet
$done = 0
foreach ($t in $frontier) {
    if ($done -ge $Max) { break }
    $n = $t.number
    $branch = "loop/$n"
    $wt = Join-Path (Split-Path $root -Parent) "hsapoints-loop-$n"
    Say "starting #$n $($t.title)"
    gh issue edit $n --repo $repo --add-assignee '@me' | Out-Null
    git worktree add -B $branch $wt "origin/$Base" | Out-Null

    $frontend = Join-Path $wt 'frontend'
    Push-Location $frontend
    cmd /c "npm ci > `"$tmp\npm-ci.log`" 2>&1"
    Pop-Location

    $needsEmulator = ($t.body -match '(?i)emulator|firestore\.rules')
    $failure = ''
    $passed = $false
    for ($attempt = 1; $attempt -le ($Retries + 1); $attempt++) {
        $p = (Get-Content (Join-Path $PSScriptRoot 'prompt.md') -Raw).
            Replace('{{N}}', "$n").Replace('{{PARENT}}', "$Parent").
            Replace('{{TICKET}}', "$($t.title)`n`n$($t.body)").Replace('{{FAILURE}}', $failure)
        $pf = Join-Path $tmp "prompt-$n.md"
        Set-Content $pf $p -Encoding utf8
        Say "attempt ${attempt}: claude -p (max $MaxTurns turns)"
        Push-Location $wt
        Get-Content $pf -Raw | claude -p --max-turns $MaxTurns `
            --allowedTools 'Read' 'Edit' 'Write' 'Glob' 'Grep' 'Bash(git add:*)' 'Bash(git commit:*)' `
            'Bash(git status:*)' 'Bash(git diff:*)' 'Bash(git log:*)' 'Bash(npm run:*)' 'Bash(npx vitest:*)' 'Bash(npm test:*)'
        Pop-Location

        $gate = Invoke-Gate $frontend $needsEmulator
        $commits = [int](git -C $wt rev-list --count "origin/$Base..HEAD")
        if ($gate.ok -and $commits -gt 0) { $passed = $true; break }
        if ($gate.ok) { $failure = "Your last attempt made no commits. Commit your work." }
        else { $failure = "The gate failed at 'npm run $($gate.step)'. Fix it. Last output:`n$($gate.tail)" }
        Say "gate not green ($failure.Substring(0, [Math]::Min(80, $failure.Length)))"
    }

    if (-not $passed) {
        Say "#$n failed after $($Retries + 1) attempts; unassigning and stopping. Worktree kept at $wt"
        gh issue edit $n --repo $repo --remove-assignee '@me' | Out-Null
        gh issue comment $n --repo $repo --body "Loop gave up after $($Retries + 1) attempts. Last failure:`n``````n$failure`n``````" | Out-Null
        exit 1
    }

    git -C $wt push -u origin $branch
    $bf = Join-Path $tmp "pr-$n.md"
    @"
Part of #$Parent. Implements #$n.

Built by the ticket loop in a fresh session and gated on typecheck and tests (plus emulator tests when the ticket touches rules). Review as usual; merge into ``$Base`` and the next loop run closes #$n.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
"@ | Set-Content $bf -Encoding utf8
    gh pr create --repo $repo --base $Base --head $branch --title "$($t.title) (#$n)" --body-file $bf
    git worktree remove --force $wt
    $done++
}
Say "done: $done ticket(s) sent to PR"
