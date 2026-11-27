import React from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlacePrediction } from '../placesApi';

const PINK_ACCENT = '#FF2D55';
const DARK_BG = '#1C1C1E';

interface SearchInputProps {
    query: string;
    onChange: (text: string) => void;
    onClear: () => void;
}

export function SearchInput({ query, onChange, onClear }: SearchInputProps) {
    return (
        <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={18} color="#8E8E93" style={{ marginRight: 8 }} />
            <TextInput
                style={styles.searchInput}
                placeholder="Search cities, places, streets..."
                placeholderTextColor="#8E8E93"
                value={query}
                onChangeText={onChange}
            />
            {query.length > 0 && (
                <TouchableOpacity onPress={onClear}>
                    <Ionicons name="close-circle" size={18} color="#8E8E93" />
                </TouchableOpacity>
            )}
        </View>
    );
}

interface SearchResultsProps {
    results: PlacePrediction[];
    onSelect: (placeId: string, name: string) => void;
}

export function SearchResults({ results, onSelect }: SearchResultsProps) {
    if (results.length === 0) return null;

    return (
        <View style={styles.resultsList}>
            <FlatList
                data={results}
                keyboardShouldPersistTaps="handled"
                keyExtractor={(item) => item.place_id}
                renderItem={({ item }) => {
                    const mainText = item.structured_formatting?.main_text || item.description;
                    const secondaryText = item.structured_formatting?.secondary_text || '';
                    return (
                        <TouchableOpacity style={styles.resultItem} onPress={() => onSelect(item.place_id, mainText)}>
                            <Ionicons name="location" size={18} color={PINK_ACCENT} style={{ marginRight: 10 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.resultMainText}>{mainText}</Text>
                                {secondaryText !== '' && <Text style={styles.resultSubText}>{secondaryText}</Text>}
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    searchBarContainer: {
        flex: 1,
        height: 46,
        backgroundColor: DARK_BG,
        borderRadius: 23,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    searchInput: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 14,
    },
    resultsList: {
        backgroundColor: DARK_BG,
        borderRadius: 16,
        marginTop: 8,
        maxHeight: 240,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    resultMainText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    resultSubText: {
        color: '#8E8E93',
        fontSize: 12,
        marginTop: 2,
    },
});
