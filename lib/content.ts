/**
 * CONTENT FILE — edit this file to change any user-visible text in the app.
 *
 * Rules for editing:
 *   - Find the section that matches the part of the app you want to change.
 *   - Change the text inside the quotes on the right side of the colon.
 *   - Do NOT rename the keys (the words on the left side of the colon).
 *   - Save the file — changes take effect immediately when the dev server reloads.
 */

// ─── Navigation (app/page.tsx) ────────────────────────────────────────────────

export const NAV = {
  appTitle:   "Wanderlist",
  appTagline: "A Place To Plan Your Wanderlust!",
  timeline:   "Timeline",
  trips:      "Trips",
  history:    "History",
  settings:   "Settings",
};

// ─── Onboarding tour (components/OnboardingModal.tsx) ─────────────────────────

export const ONBOARDING = {
  steps: [
    {
      title: "Welcome to Wanderlist",
      body:  "Wanderlist is your 'bucket list' travel planner — collect trip ideas, schedule them on a multi-year calendar, and track trip planning from wishlist to booked. This short tour covers key features. You can reopen it anytime from the ? button in the nav.",
    },
    {
      title: "Add & Organize Your Trips",
      body:  "Open the sidebar and tap the + button to add a new trip. Give it a name, destination, trip type, and estimated duration in weeks. It lands in your Unscheduled queue, ready to be placed on the calendar.",
    },
    {
      title: "Schedule Trips by Dragging",
      body:  "Drag any unscheduled trip from the sidebar and drop it onto a month on the calendar. The bar appears spanning the duration you set. Drag the edges to resize, or drag the bar itself to move to a new month.",
    },
    {
      title: "Click Any Trip to Edit Details",
      body:  "Click a trip bar on the calendar (or a card in the sidebar) to open the details panel. Set the status from Planning to Booked, add notes, estimated cost, a Book By deadline, and more.",
    },
    {
      title: "Collaborate with Friends & Family",
      body:  "Share your workspace by sending an invite link from the workspace menu — friends and family join as editors and see all your trips in real time. Mark any trip Private to hide it from collaborators. A sparkle badge on a card means someone updated it in the last three days.",
    },
    {
      title: "Explore Every View",
      body:  "Switch between Timeline, Trips, History, and Settings using the top nav. Use the export icon to save your trips as a JSON backup, or the import icon to restore from a saved file.",
    },
  ],
  buttons: {
    back:       "Back",
    next:       "Next",
    skip:       "Skip",
    getStarted: "Get Started",
  },
};

// ─── Trip edit modal (components/TripEditModal.tsx) ───────────────────────────

export const TRIP_EDIT = {
  modalTitle: "Trip Detail",
  labels: {
    tripName:      "Trip Name *",
    destination:   "Destination",
    continent:     "Continent",
    tripType:      "Trip Type",
    tags:          "Tags",
    travelGroup:   "Travel Group",
    status:        "Status",
    duration:      "Duration",
    durationUnit:  "weeks",
    estimatedCost: "Estimated Cost",
    calendarRange: "Calendar Range",
    calendarStart: "Start",
    calendarEnd:   "End",
    bookByDate:    "Book By Date",
    imageUrl:      "Image URL",
    notes:         "Notes",
    isPrivate:     "Private (only visible to you)",
    lastUpdatedBy: "Last updated by",
  },
  placeholders: {
    tripName:    "Trip name",
    destination: "City, Country",
    imageUrl:    "https://...",
    notes:       "Any notes about this trip...",
    tags:        "Type and press Enter",
  },
  actions: {
    schedule:      "+ Schedule",
    removeDates:   "✕ Remove dates",
    addBookBy:     "Add",
    removeBookBy:  "Remove",
    cancel:        "Cancel",
    saveChanges:   "Save changes",
    deleteTrip:    "Delete trip",
    deleteConfirm: "Delete",
    goBack:        "Go back",
    confirmChange: "Confirm change",
  },
  warnings: {
    bookedChangTitle: "⚠️ This trip is booked — confirm date/duration change?",
    bookedChangBody:  "You're modifying dates or duration on a booked trip. Make sure any flights or hotels are updated accordingly.",
    conflictTitle:    "Scheduling Conflict",
    conflictBody:     "Adjust dates or update blackout periods in Settings.",
    bookByPassed:     "Book By date has passed — book this trip or remove the date.",
    bookByBefore:     "Book By date must be before the trip's start month.",
    bookedLabel:      "⚠️ This trip is booked!",
    deletePrompt:     "Delete permanently?",
  },
};

// ─── Filter bar (components/FilterBar.tsx) ────────────────────────────────────

export const FILTER_BAR = {
  searchPlaceholder: "Search trips…",
  travelGroup:       "Travel Group",
  status:            "Status",
  clearFilters:      "Clear Filters",
  travelType:        "Travel Type",
  region:            "Region",
};

// ─── Trips list panel (components/TripsListPanel.tsx) ─────────────────────────

export const TRIPS_LIST = {
  pageTitle:     "All Trips",
  addTripButton: "Add Trip",
  newTripLabel:  "New Trip",
  emptyDefault:  "No trips yet. Add one above.",
  emptyFiltered: "No trips match the current filters.",
  filterLabels: {
    status:      "Status",
    travelGroup: "Travel Group",
    travelType:  "Travel Type",
    year:        "Year",
  },
  clearFilters:  "Clear filters",
  cancelButton:  "Cancel",
  statusSectionLabels: {
    booked:      "Booked",
    planning:    "Planning",
    unscheduled: "Unscheduled",
    completed:   "Completed",
  },
  formPlaceholders: {
    tripName:    "Trip name *",
    destination: "Destination (optional)",
    tripType:    "Trip type (optional)",
    tags:        "Tags — press Enter to add",
  },
};

// ─── Trip sidebar (components/TripSidebar.tsx) ────────────────────────────────

export const TRIP_SIDEBAR = {
  header:           "Unscheduled Trips",
  emptyState:       "No unscheduled trips. Add one above or drag a trip back from the calendar.",
  dropToUnschedule: "Drop to unschedule",
  addTripButton:    "Add Trip",
  cancelButton:     "Cancel",
  durationUnit:     "wks",
  formPlaceholders: {
    tripName:    "Trip name *",
    destination: "Destination (city, country)",
    tags:        "Tags (Enter to add)",
  },
};

// ─── Trip card (components/TripCard.tsx) ──────────────────────────────────────

export const TRIP_CARD = {
  noGroup:          "No group",
  bookOverdue:      "Booking overdue",
  blackoutOverlap:  "Overlaps a blackout period",
  privateIndicator: "Private trip",
  recentlyUpdated:  "Recently updated",
};

// ─── Past trip prompt (components/PastTripPrompt.tsx) ─────────────────────────

export const PAST_TRIP_PROMPT = {
  question:     "Did this trip happen?",
  remaining:    "remaining",
  didntHappen:  "No, didn't happen",
  markComplete: "Yes, mark complete",
};

// ─── Settings panel (components/BudgetPanel.tsx) ──────────────────────────────

export const SETTINGS = {
  sections: {
    budget: {
      title:    "Travel Budget",
      subtitle: "Set your overall budget, currency, and year-by-year allocations.",
    },
    blackout: {
      title:    "Blackout Dates",
      subtitle: "Define periods when you can't travel. Scheduled trips that overlap will show a conflict warning.",
    },
    groups: {
      title:    "Travel Groups",
      subtitle: "Organize trips by who you're travelling with. The ★ group is the default for new trips.",
    },
    types: {
      title:    "Trip Types",
      subtitle: "Customize the types used to classify your trips.",
    },
    display: {
      title:    "Customizations",
      subtitle: "Set your appearance and navigation preferences.",
    },
  },
};

// ─── Migration modal (components/MigrationModal.tsx) ─────────────────────────

export const MIGRATION = {
  title:        "Your trips are ready to import",
  body:         "We found trips saved on this device from before you signed in. Import them into your account so they're backed up and available everywhere.",
  importButton: "Import my trips",
  skipButton:   "Skip for now",
  importing:    "Importing your trips…",
  successTitle: "All imported!",
  successBody:  "Your trips are now saved to your account and will sync across devices.",
  errorTitle:   "Import failed",
  errorBody:    "Something went wrong. Your local data is still safe — try again, or skip and import later.",
  doneButton:   "Continue",
};

// ─── Workspace switcher (components/WorkspaceSwitcher.tsx) ───────────────────

export const WORKSPACE = {
  newWorkspace:      "New workspace",
  createPlaceholder: "Workspace name…",
  createButton:      "Create",
  saveButton:        "Save",
  cancelButton:      "Cancel",
  // {name} is replaced with the workspace name at runtime
  deleteConfirm:     "Are you sure you want to delete \"{name}\"? All trips and data in this workspace will be permanently removed.",

  // ─── Sharing / members modal ──────────────────────────────────────────────
  shareTitle:       "Share workspace",
  inviteSection:    "Invite link",
  copyLink:         "Copy",
  resetLink:        "Reset link (invalidates old link)",
  membersSection:   "Members",
  roleLabels: {
    owner:  "Owner",
    editor: "Editor",
    viewer: "Viewer",
  },
  removeMember:     "Remove from workspace",
  // ─── Join page (/join/[code]) ─────────────────────────────────────────────
  joinTitle:        "You've been invited!",
  joinBody:         "Join this shared Wanderlist workspace:",
  joinButton:       "Join workspace",
  alreadyMember:    "You're already a member",
  newBadge:         "New",
};

export const GUEST = {
  banner:    "Guest mode — sign up to sync across devices and collaborate.",
  signInCta: "Create account",
};

// ─── Shared data constants ─────────────────────────────────────────────────────
// These replace duplicated arrays scattered across components.

export const MONTH_NAMES_LONG: string[] = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export const MONTH_NAMES_SHORT: string[] = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

export const CONTINENTS = [
  "North America","South America","Europe",
  "Africa","Asia","Oceania","Antarctica",
] as const;
