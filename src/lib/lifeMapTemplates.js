// Starter example mind maps. Loading one drops real, already-connected nodes
// onto the canvas so a blank canvas doesn't leave you guessing how to start —
// drag them apart, rename, delete, or connect further as needed.

export const LIFE_MAP_TEMPLATES = [
  {
    id: 'fitness',
    icon: '💪',
    name: 'Get Fit & Healthy',
    nodes: [
      { id: 't-vision', label: 'Get fit and healthy', kind: 'goal', x: 360, y: 40 },
      { id: 't-gym', label: 'Build a 3x/week gym habit', kind: 'task', x: 120, y: 200 },
      { id: 't-meals', label: 'Meal prep every Sunday', kind: 'task', x: 360, y: 200 },
      { id: 't-sleep', label: 'Sleep 7+ hours a night', kind: 'task', x: 600, y: 200 },
      { id: 't-avoid', label: "Don't skip two workouts in a row", kind: 'avoid', x: 120, y: 340 },
      { id: 't-note', label: 'Progress photo every 2 weeks', kind: 'note', x: 600, y: 340 },
    ],
    edges: [
      { id: 't-e1', source: 't-vision', target: 't-gym' },
      { id: 't-e2', source: 't-vision', target: 't-meals' },
      { id: 't-e3', source: 't-vision', target: 't-sleep' },
      { id: 't-e4', source: 't-gym', target: 't-avoid' },
      { id: 't-e5', source: 't-sleep', target: 't-note' },
    ],
  },
  {
    id: 'career',
    icon: '💼',
    name: 'Switch Careers',
    nodes: [
      { id: 'c-vision', label: 'Switch into software engineering', kind: 'goal', x: 360, y: 40 },
      { id: 'c-learn', label: 'Learn fundamentals daily', kind: 'task', x: 120, y: 200 },
      { id: 'c-project', label: 'Build a portfolio project', kind: 'task', x: 360, y: 200 },
      { id: 'c-network', label: 'Talk to 1 person in the field weekly', kind: 'task', x: 600, y: 200 },
      { id: 'c-avoid', label: "Don't tutorial-hop without finishing", kind: 'avoid', x: 360, y: 340 },
    ],
    edges: [
      { id: 'c-e1', source: 'c-vision', target: 'c-learn' },
      { id: 'c-e2', source: 'c-vision', target: 'c-project' },
      { id: 'c-e3', source: 'c-vision', target: 'c-network' },
      { id: 'c-e4', source: 'c-learn', target: 'c-avoid' },
    ],
  },
]
