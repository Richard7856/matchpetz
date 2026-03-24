import {
    HeartPulse, Dumbbell, Stethoscope, Building2,
    Coffee, Home, Baby, Scissors, Footprints,
} from 'lucide-react';

export const ROLE_CONFIG = {
    veterinaria: { label: 'Veterinaria', Icon: HeartPulse, color: '#e8f5e9' },
    entrenador: { label: 'Entrenador', Icon: Dumbbell, color: '#f3e5f5' },
    clinica: { label: 'Clínica', Icon: Stethoscope, color: '#e3f2fd' },
    hotel: { label: 'Hotel', Icon: Building2, color: '#e0f2f1' },
    cafeteria: { label: 'Cafetería', Icon: Coffee, color: '#fff8e1' },
    refugio: { label: 'Refugio', Icon: Home, color: '#fce4ec' },
    guarderia: { label: 'Guardería', Icon: Baby, color: '#e0f7fa' },
    grooming: { label: 'Grooming', Icon: Scissors, color: '#fce4ec' },
    paseador: { label: 'Paseador', Icon: Footprints, color: '#fff3e0' },
};

export const ALL_ROLE_TYPES = Object.entries(ROLE_CONFIG).map(([value, cfg]) => ({
    value,
    label: cfg.label,
}));
