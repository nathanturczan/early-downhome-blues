// Ensemble module - Firebase auth and room management

let currentUser = null;
let activeRoom = null;
let isHost = false;
let roomUnsubscribe = null;

// DOM elements (initialized in initEnsemble)
let ensembleBtn, ensembleModal, modalClose, modalBackdrop;
let signedOutSection, signedInSection, googleSignInBtn, signOutBtn, userDisplayName;
let ensembleSelect, newEnsembleName, createEnsembleBtn, joinRoomSelect;
let activeEnsembleSection, activeEnsembleName, activeEnsembleRole, leaveEnsembleBtn;

// Wait for Firebase to be ready
function waitForFirebase() {
    return new Promise((resolve) => {
        const check = () => {
            if (window.firebaseAuth && window.firebaseDb && window.firebaseFunctions) {
                resolve();
            } else {
                setTimeout(check, 100);
            }
        };
        check();
    });
}

// Initialize ensemble module
export async function initEnsemble(onRoomUpdate) {
    // Get DOM elements
    ensembleBtn = document.getElementById('ensemble-btn');
    ensembleModal = document.getElementById('ensemble-modal');
    modalClose = ensembleModal.querySelector('.modal-close');
    modalBackdrop = ensembleModal.querySelector('.modal-backdrop');

    signedOutSection = document.getElementById('ensemble-signed-out');
    signedInSection = document.getElementById('ensemble-signed-in');
    googleSignInBtn = document.getElementById('google-sign-in-btn');
    signOutBtn = document.getElementById('sign-out-btn');
    userDisplayName = document.getElementById('user-display-name');

    ensembleSelect = document.getElementById('ensemble-select');
    newEnsembleName = document.getElementById('new-ensemble-name');
    createEnsembleBtn = document.getElementById('create-ensemble-btn');
    joinRoomSelect = document.getElementById('join-room-select');

    activeEnsembleSection = document.getElementById('active-ensemble');
    activeEnsembleName = document.getElementById('active-ensemble-name');
    activeEnsembleRole = document.getElementById('active-ensemble-role');
    leaveEnsembleBtn = document.getElementById('leave-ensemble-btn');

    console.log('[Ensemble] Initializing...');

    await waitForFirebase();
    console.log('[Ensemble] Firebase ready');

    const { onAuthStateChanged } = window.firebaseFunctions;

    // Modal open/close
    ensembleBtn.addEventListener('click', () => {
        console.log('[Ensemble] Opening modal');
        ensembleModal.classList.remove('hidden');
    });
    modalClose.addEventListener('click', () => {
        ensembleModal.classList.add('hidden');
    });
    modalBackdrop.addEventListener('click', () => {
        ensembleModal.classList.add('hidden');
    });

    // Auth state listener
    onAuthStateChanged(window.firebaseAuth, (user) => {
        currentUser = user;
        updateAuthUI();
        if (user) {
            loadUserRooms();
        }
    });

    // Sign in button
    googleSignInBtn.addEventListener('click', signIn);
    signOutBtn.addEventListener('click', signOutUser);

    // Ensemble controls
    ensembleSelect.addEventListener('change', handleSelectRoom);
    createEnsembleBtn.addEventListener('click', handleCreateRoom);
    joinRoomSelect.addEventListener('change', handleJoinRoom);
    leaveEnsembleBtn.addEventListener('click', handleLeaveRoom);

    // Store callback for room updates
    window.onEnsembleRoomUpdate = onRoomUpdate;
}

function updateAuthUI() {
    if (currentUser) {
        signedOutSection.classList.add('hidden');
        signedInSection.classList.remove('hidden');
        userDisplayName.textContent = currentUser.displayName || currentUser.email;
        ensembleBtn.classList.add('active');
    } else {
        signedOutSection.classList.remove('hidden');
        signedInSection.classList.add('hidden');
        ensembleBtn.classList.remove('active');
        activeEnsembleSection.classList.add('hidden');
    }
}

async function signIn() {
    const { signInWithPopup } = window.firebaseFunctions;
    try {
        await signInWithPopup(window.firebaseAuth, window.firebaseGoogleProvider);
    } catch (err) {
        console.error('Sign in error:', err);
        alert('Sign in failed. Please try again.');
    }
}

async function signOutUser() {
    const { signOut } = window.firebaseFunctions;
    try {
        if (activeRoom) {
            handleLeaveRoom();
        }
        await signOut(window.firebaseAuth);
    } catch (err) {
        console.error('Sign out error:', err);
    }
}

async function loadUserRooms() {
    if (!currentUser) return;

    const { collection, query, where, getDocs } = window.firebaseFunctions;

    try {
        // Load user's hosted rooms
        const hostedQuery = query(
            collection(window.firebaseDb, 'rooms'),
            where('hostId', '==', currentUser.uid)
        );
        const hostedSnapshot = await getDocs(hostedQuery);

        ensembleSelect.innerHTML = '<option value="">Select existing ensemble</option>';
        hostedSnapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const option = document.createElement('option');
            option.value = docSnap.id;
            option.textContent = data.roomName;
            ensembleSelect.appendChild(option);
        });

        // Load all rooms for joining (excluding user's own)
        const allRoomsSnapshot = await getDocs(collection(window.firebaseDb, 'rooms'));

        joinRoomSelect.innerHTML = '<option value="">Select ensemble to join</option>';
        allRoomsSnapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            // Exclude user's own rooms from join list
            if (data.hostId !== currentUser.uid) {
                const option = document.createElement('option');
                option.value = docSnap.id;
                option.textContent = `${data.roomName} (by ${data.hostName})`;
                joinRoomSelect.appendChild(option);
            }
        });
    } catch (err) {
        console.error('Error loading rooms:', err);
    }
}

async function handleSelectRoom() {
    const roomId = ensembleSelect.value;
    if (!roomId) return;

    await joinRoom(roomId, true);
}

async function handleCreateRoom() {
    const name = newEnsembleName.value.trim();
    if (!name) {
        alert('Please enter an ensemble name');
        return;
    }
    if (!currentUser) {
        alert('Please sign in first');
        return;
    }

    const { collection, addDoc } = window.firebaseFunctions;

    try {
        const docRef = await addDoc(collection(window.firebaseDb, 'rooms'), {
            roomName: name,
            hostId: currentUser.uid,
            hostName: currentUser.displayName || currentUser.email || 'Unknown',
            bpm: 60,
            chordData: null,
            scaleData: null,
            pitchClasses: null,
            createdAt: Date.now()
        });

        newEnsembleName.value = '';
        await loadUserRooms();
        await joinRoom(docRef.id, true);
    } catch (err) {
        console.error('Error creating room:', err);
        alert('Failed to create ensemble. Please try again.');
    }
}

async function handleJoinRoom() {
    const roomId = joinRoomSelect.value;
    if (!roomId) return;

    await joinRoom(roomId, false);
}

async function joinRoom(roomId, asHost) {
    const { doc, getDoc, onSnapshot } = window.firebaseFunctions;

    console.log('[Ensemble] Attempting to join room:', roomId, 'asHost:', asHost);

    // Leave current room if any
    if (roomUnsubscribe) {
        roomUnsubscribe();
        roomUnsubscribe = null;
    }

    try {
        // Verify room exists
        const roomRef = doc(window.firebaseDb, 'rooms', roomId);
        console.log('[Ensemble] Fetching room document...');
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) {
            console.error('[Ensemble] Room not found:', roomId);
            alert('Room not found');
            return;
        }
        console.log('[Ensemble] Room found:', roomSnap.data());

        const roomData = roomSnap.data();
        activeRoom = { id: roomId, ...roomData };
        isHost = asHost;

        // Update UI
        activeEnsembleSection.classList.remove('hidden');
        activeEnsembleName.textContent = roomData.roomName;
        activeEnsembleRole.textContent = isHost ? 'Host' : 'Member';
        activeEnsembleRole.classList.toggle('member', !isHost);
        ensembleBtn.classList.add('active');

        // Subscribe to room changes
        roomUnsubscribe = onSnapshot(roomRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                activeRoom = { id: roomId, ...data };

                // Notify app of room update
                if (window.onEnsembleRoomUpdate) {
                    window.onEnsembleRoomUpdate(activeRoom, isHost);
                }
            }
        });

        // Clear join select
        joinRoomSelect.value = '';

        console.log(`[Ensemble] Joined room ${roomId} as ${isHost ? 'host' : 'member'}`);
    } catch (err) {
        console.error('[Ensemble] Error joining room:', err.message, err);
        alert(`Failed to join room: ${err.message}`);
    }
}

function handleLeaveRoom() {
    if (roomUnsubscribe) {
        roomUnsubscribe();
        roomUnsubscribe = null;
    }

    activeRoom = null;
    isHost = false;
    activeEnsembleSection.classList.add('hidden');
    ensembleSelect.value = '';

    if (window.onEnsembleRoomUpdate) {
        window.onEnsembleRoomUpdate(null, false);
    }

    console.log('[Ensemble] Left room');
}

// Export function to update room state (for host)
export async function updateRoomState(updates) {
    if (!activeRoom || !isHost) return;

    const { doc, updateDoc } = window.firebaseFunctions;

    try {
        const roomRef = doc(window.firebaseDb, 'rooms', activeRoom.id);
        await updateDoc(roomRef, {
            ...updates,
            updatedAt: Date.now()
        });
    } catch (err) {
        console.error('Error updating room:', err);
    }
}

// Get current ensemble state
export function getEnsembleState() {
    return {
        user: currentUser,
        room: activeRoom,
        isHost
    };
}
