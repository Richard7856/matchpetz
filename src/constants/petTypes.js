// Common pet types used across all forms (adoption, pets, alerts, filters)
// When the user selects 'otro', show a text input for custom type

export const PET_TYPES = [
    { value: 'perro', label: 'Perro', emoji: '🐶' },
    { value: 'gato', label: 'Gato', emoji: '🐱' },
    { value: 'ave', label: 'Ave', emoji: '🐦' },
    { value: 'conejo', label: 'Conejo', emoji: '🐰' },
    { value: 'hamster', label: 'Hámster', emoji: '🐹' },
    { value: 'pez', label: 'Pez', emoji: '🐟' },
    { value: 'tortuga', label: 'Tortuga', emoji: '🐢' },
    { value: 'serpiente', label: 'Serpiente', emoji: '🐍' },
    { value: 'huron', label: 'Hurón', emoji: '🦦' },
    { value: 'erizo', label: 'Erizo', emoji: '🦔' },
    { value: 'otro', label: 'Otro', emoji: '🐾' },
];

// For filters that include "all"
export const PET_TYPE_FILTERS = [
    { value: 'todos', label: 'Todos' },
    ...PET_TYPES,
];
