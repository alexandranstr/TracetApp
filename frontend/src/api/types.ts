export interface Pagination {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
}

export interface MessageResponse {
    success: boolean;
    message: string;
}
