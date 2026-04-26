// ── Avatar builder data ────────────────────────────────────────────────────────

export const CHARACTERS = [
  { id: 'owl',     emoji: '🦉', name: 'Lexie'   },
  { id: 'cat',     emoji: '🐱', name: 'Whiskers'},
  { id: 'dog',     emoji: '🐶', name: 'Biscuit' },
  { id: 'bunny',   emoji: '🐰', name: 'Hoppy'   },
  { id: 'fox',     emoji: '🦊', name: 'Foxy'    },
  { id: 'bear',    emoji: '🐻', name: 'Cubby'   },
  { id: 'penguin', emoji: '🐧', name: 'Penny'   },
  { id: 'frog',    emoji: '🐸', name: 'Ribbit'  },
];

export const AVATAR_COLORS = [
  { id: 'orange', value: '#FF9A3C', label: 'Orange'  },
  { id: 'blue',   value: '#2D9CDB', label: 'Blue'    },
  { id: 'green',  value: '#27AE60', label: 'Green'   },
  { id: 'purple', value: '#8B5CF6', label: 'Purple'  },
  { id: 'pink',   value: '#E91E8C', label: 'Pink'    },
  { id: 'yellow', value: '#F59E0B', label: 'Yellow'  },
];

export const ACCESSORIES = [
  { id: 'none',    emoji: '✕',  label: 'None'     },
  { id: 'cap',     emoji: '🎓', label: 'Cap'      },
  { id: 'crown',   emoji: '👑', label: 'Crown'    },
  { id: 'bow',     emoji: '🎀', label: 'Bow'      },
  { id: 'glasses', emoji: '🕶️', label: 'Shades'   },
  { id: 'star',    emoji: '⭐', label: 'Star'     },
];

export function getCharacter(id) {
  return CHARACTERS.find(c => c.id === id) || CHARACTERS[0];
}

export function getAccessory(id) {
  return ACCESSORIES.find(a => a.id === id) || ACCESSORIES[0];
}
