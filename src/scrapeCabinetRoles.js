import { db } from './firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

// Flag to ensure script runs only once
let hasRunBefore = false;

/**
 * One-time script to scrape all cabinet roles from the Firebase database
 * This script will fetch all users and organize them by their cabinet roles
 */
async function scrapeCabinetRoles() {
    // Check if script has already run
    if (hasRunBefore) {
        console.log('Script has already been executed. Skipping...');
        return;
    }

    try {
        console.log('Starting cabinet roles scraping...');
        
        // Fetch all users from the database
        const usersCollection = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollection);
        
        // Object to organize users by cabinet
        const cabinetRoles = {
            president: [],
            operations: [],
            programming: [],
            communications: [],
            treasurey: [], // Note: keeping original spelling from your code
            secretary: [],
            mlpFall: [],
            mlpSpring: [],
            opa: [],
            none: [], // Regular members not in cabinet
            pending: [] // Users pending approval
        };

        // Also fetch pending users from cabinets collection
        const pendingDocRef = doc(db, "cabinets", "pending");
        const pendingDocSnap = await getDoc(pendingDocRef);
        let pendingEmails = [];
        if (pendingDocSnap.exists()) {
            pendingEmails = pendingDocSnap.data().emails || [];
        }

        // Process each user
        usersSnapshot.docs.forEach((userDoc) => {
            const userData = userDoc.data();
            const userEmail = userDoc.id;
            
            const userInfo = {
                email: userEmail,
                firstName: userData.firstName || 'N/A',
                lastName: userData.lastName || 'N/A',
                cabinet: userData.cabinet || 'none',
                position: userData.position || 'N/A',
                approved: userData.approved || false,
                eboard: userData.eboard || false,
                fallPoints: userData.fallPoints || 0,
                springPoints: userData.springPoints || 0,
                totalPoints: (userData.fallPoints || 0) + (userData.springPoints || 0)
            };

            // Check if user is in pending list
            if (pendingEmails.includes(userEmail)) {
                cabinetRoles.pending.push(userInfo);
            } else {
                // Add user to appropriate cabinet category
                const cabinet = userData.cabinet || 'none';
                if (cabinetRoles.hasOwnProperty(cabinet)) {
                    cabinetRoles[cabinet].push(userInfo);
                } else {
                    // If cabinet doesn't exist in our predefined list, add to 'none'
                    cabinetRoles.none.push(userInfo);
                }
            }
        });

        // Display results
        console.log('\n========== CABINET ROLES SCRAPING RESULTS ==========\n');
        
        Object.entries(cabinetRoles).forEach(([cabinetName, members]) => {
            if (members.length > 0) {
                console.log(`\n--- ${cabinetName.toUpperCase()} CABINET (${members.length} members) ---`);
                members.forEach((member, index) => {
                    console.log(`${index + 1}. ${member.firstName} ${member.lastName}`);
                    console.log(`   Email: ${member.email}`);
                    console.log(`   Position: ${member.position}`);
                    console.log(`   Approved: ${member.approved}`);
                    console.log(`   E-Board: ${member.eboard}`);
                    console.log(`   Total Points: ${member.totalPoints} (Fall: ${member.fallPoints}, Spring: ${member.springPoints})`);
                    console.log('   ---');
                });
            }
        });

        // Summary statistics
        const totalUsers = usersSnapshot.docs.length;
        const approvedUsers = Object.values(cabinetRoles)
            .flat()
            .filter(user => user.approved).length;
        const pendingUsers = cabinetRoles.pending.length;
        const cabinetMembers = Object.entries(cabinetRoles)
            .filter(([cabinet]) => cabinet !== 'none' && cabinet !== 'pending')
            .reduce((total, [, members]) => total + members.length, 0);

        console.log('\n========== SUMMARY STATISTICS ==========');
        console.log(`Total Users: ${totalUsers}`);
        console.log(`Approved Users: ${approvedUsers}`);
        console.log(`Pending Approval: ${pendingUsers}`);
        console.log(`Cabinet Members: ${cabinetMembers}`);
        console.log(`Regular Members: ${cabinetRoles.none.length}`);

        // Create downloadable data (as JSON)
        const scrapedData = {
            timestamp: new Date().toISOString(),
            totalUsers,
            approvedUsers,
            pendingUsers,
            cabinetMembers,
            regularMembers: cabinetRoles.none.length,
            cabinetRoles
        };

        // Convert to JSON and create downloadable blob
        const dataStr = JSON.stringify(scrapedData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        // Create download link
        const exportFileName = `hsa_cabinet_roles_${new Date().toISOString().split('T')[0]}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        linkElement.click();

        console.log(`\nData exported to: ${exportFileName}`);
        console.log('Cabinet roles scraping completed successfully!');
        
        // Mark as run to prevent re-execution
        hasRunBefore = true;

    } catch (error) {
        console.error('Error scraping cabinet roles:', error);
    }
}

// Export for use
export default scrapeCabinetRoles;

// Auto-execute if this file is imported (comment out if you want manual execution)
// scrapeCabinetRoles();