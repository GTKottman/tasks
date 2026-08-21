const SOUND_PATHS = {
    checked: "assets/sounds/box-checked.wav",
    unchecked: "assets/sounds/box-unchecked.wav",
    sectionComplete: "assets/sounds/section-completed.wav",
    routineComplete: "assets/sounds/routine-completed.wav",
};

const SOUND_VOLUMES = {
    checked: 0.35,
    unchecked: 0.25,
    sectionComplete: 0.45,
    routineComplete: 0.55,
};

const STORAGE_KEYS = {
    soundEnabled: "daily-routines-sound-enabled",
    checkboxState: "daily-routines-checkbox-state",
};

const scheduledRoutines = document.querySelectorAll(".routine[data-days]");
const checkboxes = document.querySelectorAll('input[type="checkbox"]');
const soundToggle = document.getElementById("sound-toggle");

let soundEnabled = localStorage.getItem(STORAGE_KEYS.soundEnabled) !== "false";
const audioCache = {};

function timeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return (hours * 60) + minutes;
}

function formatRoutineDateTime(date) {
    return date.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function initRoutineDateTimes() {
    scheduledRoutines.forEach((routine) => {
        if (routine.querySelector(".routine-datetime")) {
            return;
        }

        const datetime = document.createElement("div");
        datetime.className = "routine-datetime";
        datetime.setAttribute("aria-live", "polite");
        routine.prepend(datetime);
    });
}

function updateRoutineDateTimes() {
    const formatted = formatRoutineDateTime(new Date());

    document.querySelectorAll(".routine-datetime").forEach((element) => {
        element.textContent = formatted;
    });
}

function updateActiveRoutines() {
    const now = new Date();
    const day = now.getDay();
    const currentMinutes = (now.getHours() * 60) + now.getMinutes();

    scheduledRoutines.forEach((routine) => {
        const activeDays = routine.dataset.days.split(",").map(Number);
        const start = timeToMinutes(routine.dataset.start);
        const end = timeToMinutes(routine.dataset.end);
        const isActive = activeDays.includes(day)
            && currentMinutes >= start
            && currentMinutes < end;

        routine.classList.toggle("is-active", isActive);
    });

    updateRoutineDateTimes();
}

function getCheckboxKey(checkbox) {
    const column = checkbox.closest(".routine-column");
    const routine = checkbox.closest(".routine");
    const label = checkbox.closest("label")?.querySelector(".label")?.textContent.trim();
    const section = column?.querySelector("h3")?.textContent.trim();
    const routineName = routine?.querySelector("h2")?.textContent.trim();

    return `${routineName}::${section}::${label}`;
}

function loadCheckboxState() {
    let savedState = {};

    try {
        savedState = JSON.parse(localStorage.getItem(STORAGE_KEYS.checkboxState) || "{}");
    } catch {
        savedState = {};
    }

    checkboxes.forEach((checkbox) => {
        const key = getCheckboxKey(checkbox);
        if (savedState[key]) {
            checkbox.checked = true;
        }
    });
}

function saveCheckboxState() {
    const savedState = {};

    checkboxes.forEach((checkbox) => {
        if (checkbox.checked) {
            savedState[getCheckboxKey(checkbox)] = true;
        }
    });

    localStorage.setItem(STORAGE_KEYS.checkboxState, JSON.stringify(savedState));
}

function playSound(name) {
    if (!soundEnabled) {
        return;
    }

    if (!audioCache[name]) {
        audioCache[name] = new Audio(SOUND_PATHS[name]);
        audioCache[name].volume = SOUND_VOLUMES[name];
    }

    const audio = audioCache[name].cloneNode();
    audio.volume = SOUND_VOLUMES[name];
    audio.play().catch(() => {});
}

function isGroupComplete(container, selector) {
    const items = container.querySelectorAll(selector);
    return items.length > 0 && [...items].every((item) => item.checked);
}

function syncCompletionState(container, selector, completeClass) {
    const isComplete = isGroupComplete(container, selector);
    container.classList.toggle(completeClass, isComplete);
    return isComplete;
}

function handleCheckboxChange(event) {
    const checkbox = event.target;
    playSound(checkbox.checked ? "checked" : "unchecked");

    const column = checkbox.closest(".routine-column");
    const routine = checkbox.closest(".routine");
    const routineWasComplete = routine.classList.contains("is-complete");
    const sectionWasComplete = column.classList.contains("is-complete");

    saveCheckboxState();

    const routineNowComplete = syncCompletionState(routine, 'input[type="checkbox"]', "is-complete");
    const sectionNowComplete = syncCompletionState(column, 'input[type="checkbox"]', "is-complete");

    if (routineNowComplete && !routineWasComplete) {
        playSound("routineComplete");
        return;
    }

    if (sectionNowComplete && !sectionWasComplete) {
        playSound("sectionComplete");
    }
}

function updateSoundToggle() {
    if (!soundToggle) {
        return;
    }

    soundToggle.setAttribute("aria-pressed", String(!soundEnabled));
    soundToggle.setAttribute("aria-label", soundEnabled ? "Mute sounds" : "Unmute sounds");
    soundToggle.textContent = soundEnabled ? "Sounds on" : "Sounds off";
    soundToggle.classList.toggle("is-muted", !soundEnabled);
}

function initSoundToggle() {
    if (!soundToggle) {
        return;
    }

    updateSoundToggle();

    soundToggle.addEventListener("click", () => {
        soundEnabled = !soundEnabled;
        localStorage.setItem(STORAGE_KEYS.soundEnabled, String(soundEnabled));
        updateSoundToggle();

        if (soundEnabled) {
            playSound("checked");
        }
    });
}

function initCheckboxes() {
    loadCheckboxState();

    checkboxes.forEach((checkbox) => {
        const column = checkbox.closest(".routine-column");
        const routine = checkbox.closest(".routine");

        syncCompletionState(column, 'input[type="checkbox"]', "is-complete");
        syncCompletionState(routine, 'input[type="checkbox"]', "is-complete");

        checkbox.addEventListener("change", handleCheckboxChange);
    });
}

initCheckboxes();
initSoundToggle();
initRoutineDateTimes();
updateActiveRoutines();
window.setInterval(updateActiveRoutines, 30000);
