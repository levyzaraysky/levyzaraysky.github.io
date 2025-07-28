Tutorial Group Finder
Project Overview
The Tutorial Group Finder is a simple web application designed to help students connect and form study groups. Users can post new study group listings, specifying the group name/subject, available time, and preferred location. Other users can then browse the available groups and join them, facilitating collaborative learning. The application uses Google Cloud Firestore for real-time data persistence, ensuring that all group listings are shared and updated across users.

Features
User Authentication: Automatically authenticates users (anonymously or via custom token) to provide a unique userId.

Post Study Groups: Users can create new study group listings with details like subject, time, and area.

Real-time Group Listings: All posted study groups are displayed in real-time, updating automatically as new groups are added or joined.

Join Groups: Users can join existing study groups, which adds their userId to the group's members list.

Responsive Design: Built with Tailwind CSS, the interface is designed to be user-friendly and adapt to various screen sizes (mobile, tablet, desktop).

Custom Modals: Uses custom modal dialogues for user feedback (e.g., success messages, error alerts) instead of native browser alert() or confirm().

Technologies Used
HTML5: For the basic structure of the web page.

CSS3 (Tailwind CSS): For styling and responsive design, providing a modern and clean user interface.

JavaScript (ES6+): For client-side logic, form handling, and interacting with Firebase.

Google Cloud Firestore: A NoSQL cloud database used for real-time data storage and synchronization of study group information.

Firebase Authentication: Used for managing user sessions and providing unique user IDs.

How It Works (in the Canvas Environment)
This application is designed to run within the Google Canvas environment.

Initialization: Upon loading, the application initializes Firebase using global variables (__app_id, __firebase_config, __initial_auth_token) provided by the Canvas environment.

Authentication: It attempts to sign in the user. If an __initial_auth_token is available, it uses that; otherwise, it signs in anonymously. The authenticated userId is displayed on the page.

Real-time Data: Once authenticated, an onSnapshot listener is set up to fetch and display study groups from the Firestore collection artifacts/{appId}/public/data/studyGroups in real-time.

Posting Groups: When a user submits the "Post Group" form, the data is added as a new document to the studyGroups collection in Firestore. The creator's userId is automatically added to the members array of the new group.

Joining Groups: When a user clicks "Join Group", their userId is added to the members array of the selected group's document in Firestore using arrayUnion to prevent duplicates.

Firestore Data Structure
The studyGroups collection in Firestore stores documents with the following structure:

{
  "name": "Calculus I Review",
  "time": "Mon, Wed 3-5 PM",
  "area": "Library 3rd Floor",
  "createdAt": "<timestamp>", // Server timestamp when the group was created
  "createdBy": "<userId>",    // The ID of the user who created the group
  "members": [                // An array of user IDs who have joined the group
    "<userId1>",
    "<userId2>",
    "..."
  ]
}

Potential Future Enhancements
Group Details View: A dedicated page or modal to view more details about a specific group, including a list of all members.

Direct Messaging: Implement a chat feature within groups for members to communicate.

Group Management: Allow group creators to edit or delete their posted groups.

Search and Filter: Add functionality to search for groups by subject, time, or location.

User Profiles: Basic user profiles to see which groups a user has joined or created.

Notifications: Notify users when someone joins their group or when a new group matching their interests is posted.

Time/Date Pickers: Replace text inputs for time with more structured date/time pickers.
