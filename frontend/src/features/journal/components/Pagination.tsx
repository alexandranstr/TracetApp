import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pagination as PageInfo } from '../../../api/types';

const PINK_ACCENT = '#FF2D55';
const SUBTLE_TEXT = '#8E8E93';

interface PaginationProps {
    pagination: PageInfo;
    onPageChange: (page: number) => void;
}

export default function Pagination({ pagination, onPageChange }: PaginationProps) {
    return (
        <View style={styles.paginationContainer}>
            <TouchableOpacity
                style={[
                    styles.paginationButton,
                    !pagination.hasPreviousPage && styles.paginationButtonDisabled,
                ]}
                onPress={() => onPageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPreviousPage}
            >
                <Ionicons
                    name="chevron-back"
                    size={24}
                    color={pagination.hasPreviousPage ? PINK_ACCENT : SUBTLE_TEXT}
                />
                <Text
                    style={[
                        styles.paginationButtonText,
                        !pagination.hasPreviousPage && styles.paginationButtonTextDisabled,
                    ]}
                >
                    Previous
                </Text>
            </TouchableOpacity>

            <Text style={styles.paginationInfo}>
                {pagination.currentPage} / {pagination.totalPages}
            </Text>

            <TouchableOpacity
                style={[
                    styles.paginationButton,
                    !pagination.hasNextPage && styles.paginationButtonDisabled,
                ]}
                onPress={() => onPageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
            >
                <Text
                    style={[
                        styles.paginationButtonText,
                        !pagination.hasNextPage && styles.paginationButtonTextDisabled,
                    ]}
                >
                    Next
                </Text>
                <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={pagination.hasNextPage ? PINK_ACCENT : SUBTLE_TEXT}
                />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    paginationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 8,
    },
    paginationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'rgba(255,45,85,0.1)',
        borderRadius: 20,
    },
    paginationButtonDisabled: {
        opacity: 0.3,
    },
    paginationButtonText: {
        color: PINK_ACCENT,
        fontSize: 14,
        fontWeight: '600',
    },
    paginationButtonTextDisabled: {
        color: SUBTLE_TEXT,
    },
    paginationInfo: {
        color: SUBTLE_TEXT,
        fontSize: 14,
        fontWeight: '500',
    },
});
