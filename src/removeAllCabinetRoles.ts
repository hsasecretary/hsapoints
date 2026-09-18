import { db } from './firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Flag to ensure script runs only once
let hasRunBefore = false;

/**
 * One-time script to set all users' cabinet status to "none"
 * This will remove cabinet roles from all users
 */
async function removeAllCabinetRoles() {
    // Check if script has already run
    if (hasRunBefore) {
        console.log('Script has already been executed. Skipping...');
        return;
    }

    try {
        console.log('Starting cabinet roles removal...');
        
        // Fetch all users from the database
        const usersCollection = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollection);
        
        console.log(`Found ${usersSnapshot.docs.length} users to process...`);
        
        let processedCount = 0;
        let updatedCount = 0;
        const updatePromises = [];

        // Process each user
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userEmail = userDoc.id;
            
            processedCount++;
            
            // Check if user currently has a cabinet role
            if (userData.cabinet && userData.cabinet !== "none") {
                console.log(`Removing cabinet role from: ${userData.firstName} ${userData.lastName} (${userEmail}) - was ${userData.cabinet}`);
                
                // Update user to remove cabinet role
                const updatePromise = updateDoc(doc(db, "users", userEmail), {
                    cabinet: "none",
                    position: "none",
                    approved: true // Set to approved since they're now regular members
                });
                
                updatePromises.push(updatePromise);
                updatedCount++;
            } else {
                console.log(`Skipping ${userData.firstName} ${userData.lastName} (${userEmail}) - already not in cabinet`);
            }
        }

        // Execute all updates
        console.log(`Executing ${updatePromises.length} updates...`);
        await Promise.all(updatePromises);

        // Also clear all cabinet collections
        console.log('Clearing cabinet collections...');
        
        const cabinetTypes = [
            'president', 'operations', 'programming', 'communications', 
            'treasurey', 'secretary', 'mlpFall', 'mlpSpring', 'opa', 'pending'
        ];

        const clearCabinetPromises = cabinetTypes.map(async (cabinetType) => {
            try {
                await updateDoc(doc(db, "cabinets", cabinetType), {
                    emails: []
                });
                console.log(`Cleared ${cabinetType} cabinet collection`);
            } catch (error) {
                console.log(`Note: ${cabinetType} cabinet collection may not exist or is already empty`);
            }
        });

        await Promise.all(clearCabinetPromises);

        // Display results
        console.log('\n========== CABINET REMOVAL RESULTS ==========');
        console.log(`Total users processed: ${processedCount}`);
        console.log(`Users updated (removed from cabinet): ${updatedCount}`);
        console.log(`Users already not in cabinet: ${processedCount - updatedCount}`);
        console.log('All cabinet collections cleared');
        console.log('Cabinet roles removal completed successfully!');
        
        // Create summary report
        const removalReport = {
            timestamp: new Date().toISOString(),
            action: 'remove_all_cabinet_roles',
            totalUsersProcessed: processedCount,
            usersUpdated: updatedCount,
            usersAlreadyNotInCabinet: processedCount - updatedCount,
            cabinetCollectionsCleared: cabinetTypes
        };

        // Convert to JSON and create downloadable report
        const reportStr = JSON.stringify(removalReport, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(reportStr);
        
        // Create download link
        const reportFileName = `cabinet_removal_report_${new Date().toISOString().split('T')[0]}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', reportFileName);
        linkElement.click();

        console.log(`\nRemoval report exported to: ${reportFileName}`);
        
        // Mark as run to prevent re-execution
        hasRunBefore = true;

        return {
            success: true,
            totalProcessed: processedCount,
            totalUpdated: updatedCount
        };

    } catch (error) {
        console.error('Error removing cabinet roles:', error);
        throw error;
    }
}

// Export for use
export default removeAllCabinetRoles;