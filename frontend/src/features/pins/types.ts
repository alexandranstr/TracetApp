import { Pagination } from '../../api/types';

export interface PinLocation {
    id: number;
    latitude: number;
    longitude: number;
    cityName: string;
    countryName: string;
    address?: string | null;
    placeName?: string | null;
    category?: string | null;
    entityType: number;
    googlePlaceId?: string | null;
}

export interface Pin {
    id: number;
    title: string;
    journalEntry: string;
    category: string;
    rating?: number | null;
    isPrivate: boolean;
    visitedAt: string;
    createdAt: string;
    userId: string;
    userName?: string | null;
    userPhotoUrl?: string | null;
    locationId: number;
    location: PinLocation;
    photoUrlsJson: string;
    tagsVectorJson: string;
}

export interface PinsPage {
    pins: Pin[];
    pagination: Pagination;
}

export interface Tag {
    id: number;
    name: string;
}

export interface LocationInput {
    latitude: number;
    longitude: number;
    cityName?: string;
    countryName?: string;
    address?: string;
    placeName?: string;
    category?: string;
    entityType?: number;
    googlePlaceId?: string;
}

export interface CreatePinRequest {
    title: string;
    journalEntry: string;
    category: string;
    rating: number;
    isPrivate: boolean;
    visitedAt: string;
    location: LocationInput | null;
    photoUrlsJson: string;
    tagsVectorJson: string;
}

export interface UpdatePinRequest {
    title?: string;
    journalEntry?: string;
    category?: string;
    rating?: number;
    isPrivate?: boolean;
    photoUrlsJson?: string;
}

export interface PinStatistics {
    totalPins: number;
    averageRating: number;
    countriesVisited: number;
    citiesVisited: number;
    topCountries: { country: string; count: number }[];
    topCities: { city: string; count: number }[];
    topCategories: { category: string; count: number }[];
    topTags: { tagName: string; count: number }[];
    pinsByMonth: { month: number; year: number; count: number }[];
}

export interface MapArea {
    swLat: number;
    swLng: number;
    neLat: number;
    neLng: number;
}
