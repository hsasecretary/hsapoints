import { db } from './firebase';
import { doc, updateDoc, getDoc, collection, getDocs } from 'firebase/firestore';

// Flag to ensure script runs only once
let hasRunBefore = false;

/**
 * Cabinet assignments from the CSV data
 * Maps UFL emails to their cabinet roles and positions
 */
const cabinetAssignments = {
  // Presidential Cabinet
  'garibaldig@ufl.edu': { cabinet: 'president', position: 'President' },
  'nicolebeltran@ufl.edu': { cabinet: 'president', position: 'Press Secretary' },
  'hectorcollazo@ufl.edu': { cabinet: 'president', position: 'HLSA ED' },
  'ncavalcanti@ufl.edu': { cabinet: 'president', position: 'Adelante ED' },
  'urdanetalucia@ufl.edu': { cabinet: 'president', position: 'HLHM ED' },

  // Operations Cabinet
  'einsuasti@ufl.edu': { cabinet: 'operations', position: 'Vice President of Operations' },
  'sofia.lynch@ufl.edu': { cabinet: 'operations', position: 'Assistant Operations Executive Director' },
  'jason.morgan1@ufl.edu': { cabinet: 'operations', position: 'Affiliated Organization Liason' },
  'medinarodricarla@ufl.edu': { cabinet: 'operations', position: 'Affiliated Organization Liason' },
  'benavides.dc@ufl.edu': { cabinet: 'operations', position: 'Alumni Outreach Director' },
  'zarrate.a@ufl.edu': { cabinet: 'operations', position: 'Alumni Outreach Director' },

  // Programming Cabinet
  'ngarcialamboy@ufl.edu': { cabinet: 'programming', position: 'Vice President of Programming' },
  // Note: urdanetalucia@ufl.edu appears in both Presidential and Programming - using Presidential
  'dolaya@ufl.edu': { cabinet: 'programming', position: 'GBM Director' },
  'se.duque@ufl.edu': { cabinet: 'programming', position: 'Athletics Coordinator' },
  'gutierrezluciana@ufl.edu': { cabinet: 'programming', position: 'Service Director' },
  'e.martinez3@ufl.edu': { cabinet: 'programming', position: 'Service Director' },
  'chaparteguimaite@ufl.edu': { cabinet: 'programming', position: 'Internal Socials Director' },
  'm.hudtwalcker@ufl.edu': { cabinet: 'programming', position: 'External Socials Director' },
  'kianamoreno@ufl.edu': { cabinet: 'programming', position: 'Keystone Event Director' },
  'emely.lazo@ufl.edu': { cabinet: 'programming', position: 'Keystone Event Director' },

  // Communications Cabinet
  'iochoa@ufl.edu': { cabinet: 'communications', position: 'Vice President of Communications' },
  'carolina.cardozo@ufl.edu': { cabinet: 'communications', position: 'Assistant Communications Executive Director' },
  'josuezuniga@ufl.edu': { cabinet: 'communications', position: 'Graphics Director' },
  'mariagaitan@ufl.edu': { cabinet: 'communications', position: 'Graphics Director' },
  'adrianalima@ufl.edu': { cabinet: 'communications', position: 'Graphics Director' },
  'evilledacastillo@ufl.edu': { cabinet: 'communications', position: 'Copywriting Director' },
  'scorreacuartas@ufl.edu': { cabinet: 'communications', position: 'Engagement Director' },
  'natalialopez1@ufl.edu': { cabinet: 'communications', position: 'Digital Content Director' },
  'areyescruz@ufl.edu': { cabinet: 'communications', position: 'Digital Content Director' },
  'bacallaolorena@ufl.edu': { cabinet: 'communications', position: 'Merch Director' },
  'andreafonseca@ufl.edu': { cabinet: 'communications', position: 'Photographer' },
  'alexis.vivanco@ufl.edu': { cabinet: 'communications', position: 'Videographer' },

  // Treasurer Cabinet
  'msalvador@ufl.edu': { cabinet: 'treasurey', position: 'Treasurer' },
  'i.rojashernandez@ufl.edu': { cabinet: 'treasurey', position: 'Assistant Treasurer' },
  'perezortega.sa@ufl.edu': { cabinet: 'treasurey', position: 'Internal Fundraising Director' },
  'rachelmartinez@ufl.edu': { cabinet: 'treasurey', position: 'External Fundraising Director' },

  // Secretary Cabinet
  'i.seguinot@ufl.edu': { cabinet: 'secretary', position: 'Secretary' },
  'vesteban@ufl.edu': { cabinet: 'secretary', position: 'Assistant Secretary' },
  'ldumas@ufl.edu': { cabinet: 'secretary', position: 'Newsletter Director' },
  'isabelhernandez@ufl.edu': { cabinet: 'secretary', position: 'Webmaster' },

  // MLP Fall
  'marcelasandino@ufl.edu': { cabinet: 'mlpFall', position: 'MLP Fall Executive Director' },
  'gsantos3@ufl.edu': { cabinet: 'mlpFall', position: 'Assistant Executive Director' },
  'madison.barbeito@ufl.edu': { cabinet: 'mlpFall', position: 'Finance Director' },
  'albertoiber@ufl.edu': { cabinet: 'mlpFall', position: 'Health and Wellness Affairs Director' },
  'm.gonzalezgarcia@ufl.edu': { cabinet: 'mlpFall', position: 'Marketing Director' },
  'loganmcbride@ufl.edu': { cabinet: 'mlpFall', position: 'Marketing Director' },
  'eboutros@ufl.edu': { cabinet: 'mlpFall', position: 'Membership Relations Director' },
  'angie.pleitez@ufl.edu': { cabinet: 'mlpFall', position: 'Mentorship Director' },
  'ssortinodasilva@ufl.edu': { cabinet: 'mlpFall', position: 'Mentorship Director' },
  'fgranadoscuellar@ufl.edu': { cabinet: 'mlpFall', position: 'Inclusivity and Multicultural Affairs Director' },
  'jseguinot@ufl.edu': { cabinet: 'mlpFall', position: 'Professional and Academic Development Director' },
  'luciacontentocor@ufl.edu': { cabinet: 'mlpFall', position: 'Servant Leadership Director' },

  // MLP Spring
  'drodriguezgomez@ufl.edu': { cabinet: 'mlpSpring', position: 'MLP Spring Executive Director' },
  'lopezmaya@ufl.edu': { cabinet: 'mlpSpring', position: 'Assistant Executive Director' },
  'andres.garcia1@ufl.edu': { cabinet: 'mlpSpring', position: 'Finance Director' },
  'gamal.fernandez@ufl.edu': { cabinet: 'mlpSpring', position: 'Health and Wellness Affairs Director' },
  'jmachuca@ufl.edu': { cabinet: 'mlpSpring', position: 'Marketing Director' },
  'sboulais@ufl.edu': { cabinet: 'mlpSpring', position: 'Membership Relations Director' },
  'cfukushima@ufl.edu': { cabinet: 'mlpSpring', position: 'Mentorship Director' },
  'carrascom@ufl.edu': { cabinet: 'mlpSpring', position: 'Mentorship Director' },
  'beatrizbolanos@ufl.edu': { cabinet: 'mlpSpring', position: 'Inclusivity and Multicultural Affairs Director' },
  'rodriguez.bryan@ufl.edu': { cabinet: 'mlpSpring', position: 'Professional and Academic Development Director' },
  'agastiaburo@ufl.edu': { cabinet: 'mlpSpring', position: 'Servant Leadership Director' },

  // OPA
  'briannacastro@ufl.edu': { cabinet: 'opa', position: 'OPA Executive Director - Internal' },
  'lizetmejia@ufl.edu': { cabinet: 'opa', position: 'OPA Executive Director - External' },
  'ibetancur@ufl.edu': { cabinet: 'opa', position: 'Internal Communications Director' },
  'bello.kayla@ufl.edu': { cabinet: 'opa', position: 'Special Events Director' },
  'nandrea.pantoja@ufl.edu': { cabinet: 'opa', position: 'Research and Education Director' },
  'ivillaurrego@ufl.edu': { cabinet: 'opa', position: 'Internal Outreach Project Director' },
  'juliannemooney@ufl.edu': { cabinet: 'opa', position: 'Historian' },
  'migarza@ufl.edu': { cabinet: 'opa', position: 'External Communications Director' },
  'sophia.reyes@ufl.edu': { cabinet: 'opa', position: 'Civic Engagement Director' },
  'gabyurdaneta@ufl.edu': { cabinet: 'opa', position: 'External Outreach Project Director' },
  'navarreteadriana@ufl.edu': { cabinet: 'opa', position: 'Legislative Affairs' },

  // Chief of Staff (treating as president cabinet)
  'leslyrivero@ufl.edu': { cabinet: 'president', position: 'Chief of Staff' },

  // DM Ambassadors (treating as programming cabinet)
  'lizana.am@ufl.edu': { cabinet: 'programming', position: 'DM Ambassador' },
  'martinezmia@ufl.edu': { cabinet: 'programming', position: 'DM Ambassador' }
};

/**
 * One-time script to assign cabinet roles from the CSV data
 */
async function assignCabinetRoles() {
  // Check if script has already run
  if (hasRunBefore) {
    console.log('Script has already been executed. Skipping...');
    return;
  }

  try {
    console.log('Starting cabinet roles assignment...');
    console.log(`Processing ${Object.keys(cabinetAssignments).length} cabinet assignments...`);
    
    let updatedCount = 0;
    let notFoundCount = 0;
    let alreadyAssignedCount = 0;
    const updatePromises = [];
    const results = [];

    // Process each cabinet assignment
    for (const [email, assignment] of Object.entries(cabinetAssignments)) {
      try {
        // Check if user exists
        const userDocRef = doc(db, "users", email);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          
          // Check if already has this assignment
          if (userData.cabinet === assignment.cabinet && userData.position === assignment.position) {
            console.log(`✓ ${userData.firstName} ${userData.lastName} (${email}) already assigned to ${assignment.cabinet} as ${assignment.position}`);
            alreadyAssignedCount++;
          } else {
            console.log(`📝 Assigning ${userData.firstName} ${userData.lastName} (${email}) to ${assignment.cabinet} as ${assignment.position}`);
            
            // Update user with cabinet assignment
            const updatePromise = updateDoc(userDocRef, {
              cabinet: assignment.cabinet,
              position: assignment.position,
              approved: true // Auto-approve cabinet members
            });
            
            updatePromises.push(updatePromise);
            updatedCount++;
            
            results.push({
              email,
              name: `${userData.firstName} ${userData.lastName}`,
              cabinet: assignment.cabinet,
              position: assignment.position,
              action: 'updated'
            });
          }
        } else {
          console.log(`❌ User not found: ${email}`);
          notFoundCount++;
          results.push({
            email,
            name: 'Unknown',
            cabinet: assignment.cabinet,
            position: assignment.position,
            action: 'not_found'
          });
        }
      } catch (error) {
        console.error(`Error processing ${email}:`, error);
      }
    }

    // Execute all updates
    if (updatePromises.length > 0) {
      console.log(`\nExecuting ${updatePromises.length} updates...`);
      await Promise.all(updatePromises);
    }

    // Update cabinet collections
    console.log('\nUpdating cabinet collections...');
    
    const cabinetCollections = {};
    
    // Group emails by cabinet
    for (const [email, assignment] of Object.entries(cabinetAssignments)) {
      if (!cabinetCollections[assignment.cabinet]) {
        cabinetCollections[assignment.cabinet] = [];
      }
      cabinetCollections[assignment.cabinet].push(email);
    }

    // Update each cabinet collection
    const cabinetUpdatePromises = [];
    for (const [cabinetType, emails] of Object.entries(cabinetCollections)) {
      try {
        const cabinetDocRef = doc(db, "cabinets", cabinetType);
        cabinetUpdatePromises.push(
          updateDoc(cabinetDocRef, { emails })
        );
        console.log(`Updated ${cabinetType} cabinet collection with ${emails.length} members`);
      } catch (error) {
        console.log(`Note: Could not update ${cabinetType} cabinet collection:`, error);
      }
    }

    await Promise.all(cabinetUpdatePromises);

    // Display results
    console.log('\n========== CABINET ASSIGNMENT RESULTS ==========');
    console.log(`Total assignments processed: ${Object.keys(cabinetAssignments).length}`);
    console.log(`Users updated: ${updatedCount}`);
    console.log(`Users already assigned: ${alreadyAssignedCount}`);
    console.log(`Users not found: ${notFoundCount}`);
    console.log('Cabinet collections updated');
    
    // Show breakdown by cabinet
    console.log('\n--- CABINET BREAKDOWN ---');
    Object.entries(cabinetCollections).forEach(([cabinet, emails]) => {
      console.log(`${cabinet.toUpperCase()}: ${emails.length} members`);
    });

    // Create assignment report
    const assignmentReport = {
      timestamp: new Date().toISOString(),
      action: 'assign_cabinet_roles',
      totalAssignments: Object.keys(cabinetAssignments).length,
      usersUpdated: updatedCount,
      usersAlreadyAssigned: alreadyAssignedCount,
      usersNotFound: notFoundCount,
      cabinetBreakdown: cabinetCollections,
      detailedResults: results
    };

    // Convert to JSON and create downloadable report
    const reportStr = JSON.stringify(assignmentReport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(reportStr);
    
    // Create download link
    const reportFileName = `cabinet_assignment_report_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', reportFileName);
    linkElement.click();

    console.log(`\nAssignment report exported to: ${reportFileName}`);
    console.log('Cabinet roles assignment completed successfully!');
    
    // Mark as run to prevent re-execution
    hasRunBefore = true;

    return {
      success: true,
      totalProcessed: Object.keys(cabinetAssignments).length,
      totalUpdated: updatedCount,
      totalNotFound: notFoundCount,
      totalAlreadyAssigned: alreadyAssignedCount
    };

  } catch (error) {
    console.error('Error assigning cabinet roles:', error);
    throw error;
  }
}

// Export for use
export default assignCabinetRoles;