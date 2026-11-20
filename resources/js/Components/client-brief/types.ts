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

export interface DesignStylePreview {
    image: string;
    subtitle: string;
}

const DESIGN_STYLE_MAP: Record<string, DesignStylePreview> = {
    modern: {
        image: '/design-styles/modern.jpg',
        subtitle: 'Garis tegas, bukaan kaca lebar, fungsional',
    },
    'modern minimalis': {
        image: '/design-styles/modern.jpg',
        subtitle: 'Garis bersih, simpel & proporsional',
    },
    tropical: {
        image: '/design-styles/tropical.jpg',
        subtitle: 'Material alami, ventilasi silang & teduh',
    },
    'tropis modern': {
        image: '/design-styles/tropical.jpg',
        subtitle: 'Material alami, ventilasi silang & teduh',
    },
    japandi: {
        image: '/design-styles/japandi.jpg',
        subtitle: 'Hangat kayu natural, tenang & rapi',
    },
    scandinavian: {
        image: '/design-styles/scandinavian.jpg',
        subtitle: 'Terang, warna netral & nyaman',
    },
    skandinavia: {
        image: '/design-styles/scandinavian.jpg',
        subtitle: 'Terang, warna netral & nyaman',
    },
    'american classic': {
        image: '/design-styles/american-classic.jpg',
        subtitle: 'Simetris, profil lis elegan & timeless',
    },
    'klasik / kolonial': {
        image: '/design-styles/american-classic.jpg',
        subtitle: 'Simetris, pilar elegan & timeless',
    },
    mediterranean: {
        image: '/design-styles/mediterranean.jpg',
        subtitle: 'Lengkung artistik, tekstur hangat & terakota',
    },
    mediterania: {
        image: '/design-styles/mediterranean.jpg',
        subtitle: 'Lengkung artistik, tekstur hangat & terakota',
    },
    industrial: {
        image: '/design-styles/industrial.jpg',
        subtitle: 'Bata ekspos, baja hitam & beton raw',
    },
    minimalist: {
        image: '/design-styles/modern.jpg',
        subtitle: 'Bentuk geometris murni & lapang',
    },
    minimalis: {
        image: '/design-styles/modern.jpg',
        subtitle: 'Bentuk geometris murni & lapang',
    },
    luxury: {
        image: '/design-styles/kontemporer.jpg',
        subtitle: 'Megah, kontemporer & aksen elegan',
    },
    kontemporer: {
        image: '/design-styles/kontemporer.jpg',
        subtitle: 'Dinamis, kekinian & inovatif',
    },
};

const COMMERCIAL_SUBTITLES: Record<string, string> = {
    'modern minimalis': 'Fasad bersih, pencahayaan modern & tampilan brand profesional',
    modern: 'Fasad bersih, pencahayaan modern & tampilan brand profesional',
    industrial: 'Bata ekspos, rangka baja hitam & nuansa kafe/studio urban',
    'tropis modern': 'Semi-outdoor teduh, tanaman hijau & sirkulasi nyaman',
    tropical: 'Semi-outdoor teduh, tanaman hijau & sirkulasi nyaman',
    japandi: 'Hangat kayu natural, tenang & estetik untuk hospitality',
    skandinavia: 'Terang, ramah pengunjung & tata ruang fungsional',
    scandinavian: 'Terang, ramah pengunjung & tata ruang fungsional',
    mediterania: 'Lengkung artistik, warna hangat & spot foto ikonik',
    mediterranean: 'Lengkung artistik, warna hangat & spot foto ikonik',
    'american classic': 'Fasad simetris, elegan & berkelas untuk butik/kantor',
    kontemporer: 'Bold, kekinian, ikonik & menonjolkan karakter brand',
    luxury: 'Megah, eksklusif, aksen marmer & pencahayaan dramatis',
};

const INTERIOR_SUBTITLES: Record<string, string> = {
    japandi: 'Kayu oak terang, earth-tone, rapi & menenangkan',
    'modern minimalis': 'Furniture sleek, clean lines & built-in storage fungsional',
    modern: 'Furniture sleek, clean lines & built-in storage fungsional',
    skandinavia: 'Cerah, cozy, tekstur kain natural & cahaya lembut',
    scandinavian: 'Cerah, cozy, tekstur kain natural & cahaya lembut',
    industrial: 'Aksen besi hitam, semen ekspos & ambient light hangat',
    'tropis modern': 'Rotan/kayu alami, bukaan segar & nuansa resort',
    tropical: 'Rotan/kayu alami, bukaan segar & nuansa resort',
    'american classic': 'Wall moulding elegan, panel simetris & hangat berkelas',
    mediterania: 'Archway lembut, tekstur plester hangat & aksen terakota',
    mediterranean: 'Archway lembut, tekstur plester hangat & aksen terakota',
    kontemporer: 'Perpaduan material modern, aksen marmer & lighting dramatis',
    luxury: 'Material premium, aksen brass/marmer & ambience mewah',
};

export function getDesignStylePreview(
    option: string,
    buildingType?: 'rumah_hunian' | 'komersial' | 'interior',
): DesignStylePreview | null {
    const key = option.trim().toLowerCase();
    const base = DESIGN_STYLE_MAP[key];
    if (!base) return null;

    if (buildingType === 'komersial' && COMMERCIAL_SUBTITLES[key]) {
        return { ...base, subtitle: COMMERCIAL_SUBTITLES[key] };
    }
    if (buildingType === 'interior' && INTERIOR_SUBTITLES[key]) {
        return { ...base, subtitle: INTERIOR_SUBTITLES[key] };
    }

    return base;
}

export function isDesignStyleField(field: BriefField): boolean {
    if (field.type !== 'multiselect') return false;
    return ['gaya_desain', 'gaya_konsep', 'design_style'].includes(field.key);
}
