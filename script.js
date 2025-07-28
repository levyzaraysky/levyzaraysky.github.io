// Firebase SDK Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, arrayUnion, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// IMPORTANT: REPLACE THIS firebaseConfig WITH YOUR ACTUAL PROJECT'S CONFIGURATION
// You can find this in your Firebase Console -> Project settings -> Your apps -> Firebase SDK snippet (Config)
const firebaseConfig = {
    apiKey: "AIzaSyDvLVp7V3J6DqKx1I2NdOnOX5XAQFJ72Dc",
    authDomain: "tutorialgroupfinder.firebaseapp.com",
    projectId: "tutorialgroupfinder",
    storageBucket: "tutorialgroupfinder.firebasestorage.app",
    messagingSenderId: "420022612778",
    appId: "1:420022612778:web:b1a16af038bced73ebe453",
    measurementId: "G-8D66P4M7DT"
};

let app;
let db;
let auth;
let userId = null; // To store the current user's ID
let unsubscribeFromGroups = null; // To store the unsubscribe function for Firestore listener

// Get references to HTML elements
const loginSection = document.getElementById('loginSection');
const mainAppContent = document.getElementById('mainAppContent');
const groupForm = document.getElementById('groupForm');
const groupsList = document.getElementById('groupsList');
const noGroupsMessage = document.getElementById('noGroupsMessage');
const userIdDisplay = document.getElementById('userIdDisplay');
const messageModal = document.getElementById('messageModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalCloseButton = document.getElementById('modalCloseButton');
const googleSignInButton = document.getElementById('googleSignInButton');
const logoutButton = document.getElementById('logoutButton');

/**
 * Displays a custom modal message to the user.
 * @param {string} title - The title of the message.
 * @param {string} message - The content of the message.
 */
function showModal(title, message) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    messageModal.classList.remove('hidden');
}

// Close the modal when the OK button is clicked
modalCloseButton.addEventListener('click', () => {
    messageModal.classList.add('hidden');
});

// Initialize Firebase and set up authentication
async function initializeFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        console.log("Firebase App initialized:", app); // Debugging log
        console.log("Firebase Auth initialized:", auth); // Debugging log
        console.log("Firestore DB initialized:", db); // Debugging log

        // Listen for authentication state changes
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User is signed in.
                userId = user.uid;
                userIdDisplay.textContent = userId;
                console.log("Authenticated with user ID:", userId);

                // Show main app content, hide login
                loginSection.classList.add('hidden');
                mainAppContent.classList.remove('hidden');

                // Once authenticated, start listening for group data
                setupRealtimeGroupListener();
            } else {
                // User is signed out.
                userId = null;
                userIdDisplay.textContent = 'Not signed in';
                console.log("User is signed out.");

                // Hide main app content, show login
                mainAppContent.classList.add('hidden');
                loginSection.classList.remove('hidden');

                // Stop listening to groups if previously active
                if (unsubscribeFromGroups) {
                    unsubscribeFromGroups();
                    unsubscribeFromGroups = null;
                }
                groupsList.innerHTML = ''; // Clear groups list
                noGroupsMessage.classList.remove('hidden'); // Show no groups message

                // Attempt anonymous sign-in as a fallback if no user is present
                try {
                    console.log("Attempting anonymous sign-in...");
                    await signInAnonymously(auth);
                } catch (error) {
                    console.error("Anonymous sign-in failed:", error);
                    // If anonymous sign-in also fails, display a message
                    showModal("Authentication Required", "Please sign in with Google to use the app.");
                }
            }
        });

    } catch (error) {
        console.error("Error initializing Firebase:", error);
        showModal("Initialization Error", "Failed to initialize the application. Please ensure your Firebase config is correct and your project is set up.");
    }
}

/**
 * Handles Google Sign-In using a popup.
 */
googleSignInButton.addEventListener('click', async () => {
    console.log("Google Sign-In button clicked."); // Debugging log
    if (!auth) {
        console.error("Firebase Auth object is not initialized."); // Debugging log
        showModal("Error", "Firebase authentication is not ready. Please try again.");
        return;
    }

    const provider = new GoogleAuthProvider();
    try {
        console.log("Calling signInWithPopup..."); // Debugging log
        await signInWithPopup(auth, provider);
        // The onAuthStateChanged listener will handle updating the UI
    } catch (error) {
        console.error("Error during Google Sign-In:", error);
        let errorMessage = "Failed to sign in with Google. Please try again.";
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = "Google Sign-In window was closed. Please try again.";
        } else if (error.code === 'auth/cancelled-popup-request') {
            errorMessage = "Another sign-in popup was already open. Please complete or close it.";
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = "Network error during sign-in. Check your internet connection.";
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = "Google Sign-In is not enabled for this Firebase project. Please enable it in Firebase Console -> Authentication -> Sign-in method.";
        }
        showModal("Google Sign-In Error", errorMessage);
    }
});

/**
 * Handles user logout.
 */
logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showModal("Signed Out", "You have been signed out successfully.");
    } catch (error) {
        console.error("Error signing out:", error);
        showModal("Logout Error", "Failed to sign out. Please try again.");
    }
});

/**
 * Sets up a real-time listener for study groups from Firestore.
 * Displays them on the UI.
 */
function setupRealtimeGroupListener() {
    // Use the projectId from firebaseConfig as the appId for Firestore paths
    const currentAppId = firebaseConfig.projectId;
    const groupsCollectionRef = collection(db, `artifacts/${currentAppId}/public/data/studyGroups`);

    // If there's an existing listener, unsubscribe first to prevent duplicates
    if (unsubscribeFromGroups) {
        unsubscribeFromGroups();
    }

    // Listen for real-time updates to the 'studyGroups' collection
    unsubscribeFromGroups = onSnapshot(groupsCollectionRef, (snapshot) => {
        groupsList.innerHTML = ''; // Clear existing list
        if (snapshot.empty) {
            noGroupsMessage.classList.remove('hidden'); // Show message if no groups
        } else {
            noGroupsMessage.classList.add('hidden'); // Hide message if groups exist
            snapshot.forEach((doc) => {
                const group = doc.data();
                const groupId = doc.id;
                createGroupCard(group, groupId);
            });
        }
    }, (error) => {
        console.error("Error fetching study groups:", error);
        showModal("Data Fetch Error", "Failed to load study groups. Please try again later. Check Firestore rules.");
    });
}

/**
 * Creates and appends a study group card to the list.
 * @param {object} group - The group data from Firestore.
 * @param {string} groupId - The document ID of the group.
 */
function createGroupCard(group, groupId) {
    const groupCard = document.createElement('div');
    groupCard.className = 'bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0 md:space-x-4';

    let actionButtonHtml = '';
    let postedByText = '';

    console.log(`Rendering group: ${group.name}`); // Debugging log
    console.log(`  Current userId: ${userId}`); // Debugging log
    console.log(`  Group createdBy: ${group.createdBy}`); // Debugging log
    console.log(`  Is creator? ${userId && group.createdBy === userId}`); // Debugging log

    // Check if the current user created this group
    if (userId && group.createdBy === userId) {
        postedByText = '<span class="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded-full">Posted by you</span>';
        actionButtonHtml = `
            <button data-id="${groupId}"
                    class="delete-button bg-red-500 text-white py-2 px-5 rounded-md shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition duration-150 ease-in-out whitespace-nowrap">
                Delete Group
            </button>
        `;
    } else {
        actionButtonHtml = `
            <button data-id="${groupId}"
                    class="join-button bg-green-500 text-white py-2 px-5 rounded-md shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-150 ease-in-out whitespace-nowrap">
                Join Group
            </button>
        `;
    }

    groupCard.innerHTML = `
        <div class="flex-grow">
            <h3 class="text-xl font-semibold text-gray-800">${group.name} ${postedByText}</h3>
            <p class="text-gray-600 text-sm mt-1">
                <span class="font-medium">Time:</span> ${group.time}
            </p>
            <p class="text-gray-600 text-sm">
                <span class="font-medium">Area:</span> ${group.area}
            </p>
            <p class="text-gray-500 text-xs mt-2">
                <span class="font-medium">Members:</span> ${group.members ? group.members.length : 0}
            </p>
        </div>
        ${actionButtonHtml}
    `;
    groupsList.appendChild(groupCard);

    // Add event listener based on the button type
    if (userId && group.createdBy === userId) {
        groupCard.querySelector('.delete-button').addEventListener('click', async (event) => {
            const idToDelete = event.target.dataset.id;
            await deleteGroup(idToDelete);
        });
    } else {
        groupCard.querySelector('.join-button').addEventListener('click', async (event) => {
            const idToJoin = event.target.dataset.id;
            await joinGroup(idToJoin);
        });
    }
}

/**
 * Handles the submission of the new group form.
 * Adds the new group to Firestore.
 * @param {Event} event - The form submission event.
 */
groupForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent default form submission

    if (!userId) {
        showModal("Authentication Required", "Please sign in to post a group.");
        return;
    }

    const groupName = document.getElementById('groupName').value.trim();
    const groupTime = document.getElementById('groupTime').value.trim();
    const groupArea = document.getElementById('groupArea').value.trim();

    if (!groupName || !groupTime || !groupArea) {
        showModal("Missing Information", "Please fill in all fields to post a new group.");
        return;
    }

    try {
        // Use the projectId from firebaseConfig as the appId for Firestore paths
        const currentAppId = firebaseConfig.projectId;
        const groupsCollectionRef = collection(db, `artifacts/${currentAppId}/public/data/studyGroups`);
        await addDoc(groupsCollectionRef, {
            name: groupName,
            time: groupTime,
            area: groupArea,
            createdAt: new Date(),
            createdBy: userId, // Store who created the group
            members: [userId] // Creator is automatically a member
        });
        groupForm.reset(); // Clear the form
        showModal("Success!", "Your study group has been posted!");
    } catch (error) {
        console.error("Error adding document: ", error);
        showModal("Error Posting Group", "Failed to post your study group. Please try again.");
    }
});

/**
 * Adds the current user to the members list of a specific group.
 * @param {string} groupId - The ID of the group to join.
 */
async function joinGroup(groupId) {
    if (!userId) {
        showModal("Authentication Required", "Please sign in to join a group.");
        return;
    }

    try {
        // Use the projectId from firebaseConfig as the appId for Firestore paths
        const currentAppId = firebaseConfig.projectId;
        const groupDocRef = doc(db, `artifacts/${currentAppId}/public/data/studyGroups`, groupId);
        await updateDoc(groupDocRef, {
            members: arrayUnion(userId) // Add user ID to the members array if not already present
        });
        showModal("Group Joined!", "You have successfully joined the group!");
    } catch (error) {
        console.error("Error joining group:", error);
        showModal("Error Joining Group", "Failed to join the group. Please try again.");
    }
}

/**
 * Deletes a study group from Firestore.
 * Only the creator should be able to delete their own groups.
 * @param {string} groupId - The ID of the group to delete.
 */
async function deleteGroup(groupId) {
    if (!userId) {
        showModal("Authentication Required", "You must be signed in to delete a group.");
        return;
    }

    try {
        // Use the projectId from firebaseConfig as the appId for Firestore paths
        const currentAppId = firebaseConfig.projectId;
        const groupDocRef = doc(db, `artifacts/${currentAppId}/public/data/studyGroups`, groupId);

        // Before attempting delete, you might want to fetch the document to verify `createdBy` matches `userId`
        // However, the primary enforcement for this is Firestore security rules.
        // The UI already ensures the button is only shown to the creator.
        await deleteDoc(groupDocRef);
        showModal("Group Deleted!", "The study group has been successfully deleted.");
    } catch (error) {
        console.error("Error deleting group:", error);
        showModal("Error Deleting Group", "Failed to delete the group. You might not have permission or the group no longer exists.");
    }
}


// Initialize Firebase when the window loads
window.onload = initializeFirebase;
