export type BriefFieldType =
    | 'text'
    | 'textarea'
    | 'number'
    | 'select'
    | 'multiselect'
    | 'url'
    | 'maps'
    | 'compass'
    | 'files';

export interface BriefField {
    key: string;
    section: string;
    label: string;
    type: BriefFieldType;
    required: boolean;
    options?: string[];
    help?: string;
}

export interface BriefFile {
    url: string;
    name: string;
}

export interface BriefMapsValue {
    url?: string | null;
    lat?: string | number | null;
    lng?: string | number | null;
}

export type BriefResponses = Record<string, unknown>;

export const briefFieldTypeLabels: Record<BriefFieldType, string> = {
    text: 'Teks singkat',
    textarea: 'Paragraf',
    number: 'Angka',
    select: 'Pilihan tunggal',
    multiselect: 'Pilihan ganda (checklist)',
    url: 'Link / URL',
    maps: 'Lokasi peta (Maps)',
    compass: 'Arah mata angin',
    files: 'Upload foto / dokumen',
};

/** Group fields by section while keeping their original order. */
export function groupBriefFields(fields: BriefField[]): Array<{ section: string; fields: BriefField[] }> {
    const groups: Array<{ section: string; fields: BriefField[] }> = [];
    fields.forEach((field) => {
        const existing = groups.find((g) => g.section === field.section);
        if (existing) {
            existing.fields.push(field);
        } else {
            groups.push({ section: field.section, fields: [field] });
        }
    });
    return groups;
}

/** Try to resolve coordinates from a maps value (explicit lat/lng or a Google Maps URL). */
export function resolveMapsCoordinates(value?: BriefMapsValue | null): { lat: number; lng: number } | null {
    if (!value) return null;
    const lat = value.lat !== undefined && value.lat !== null && value.lat !== '' ? Number(value.lat) : NaN;
    const lng = value.lng !== undefined && value.lng !== null && value.lng !== '' ? Number(value.lng) : NaN;
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return { lat, lng };
    }

    const url = value.url || '';
    const patterns = [/@(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/, /^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return { lat: Number(match[1]), lng: Number(match[2]) };
        }
    }
    return null;
}

export function mapsEmbedUrl(value?: BriefMapsValue | null, fallbackQuery?: string): string | null {
    const coords = resolveMapsCoordinates(value);
    if (coords) {
        return `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=17&output=embed`;
    }
    if (fallbackQuery && fallbackQuery.trim() !== '') {
        return `https://maps.google.com/maps?q=${encodeURIComponent(fallbackQuery)}&z=16&output=embed`;
    }
    return null;
}

export function mapsOpenUrl(value?: BriefMapsValue | null): string | null {
    if (!value) return null;
    if (value.url && /^https?:\/\//i.test(value.url)) return value.url;
    const coords = resolveMapsCoordinates(value);
    return coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}` : null;
}

export function isImageUrl(url: string): boolean {
    return /\.(jpe?g|png|webp|gif|heic)$/i.test(url);
}
