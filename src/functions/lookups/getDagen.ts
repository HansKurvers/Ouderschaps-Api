import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';

// In-memory cache for dagen
let dagenCache: Array<{id: number, naam: string}> | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to clear cache (for testing purposes)
export function clearDagenCache(): void {
    dagenCache = null;
    cacheTimestamp = null;
}

export async function getDagen(
    _request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    // Check if we have valid cached data
    const now = Date.now();
    if (dagenCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
        context.log('Returning cached dagen data');
        return createSuccessResponse(dagenCache);
    }

    const dbService = new DossierDatabaseService();

    try {
        // Initialize database connection
        await dbService.initialize();

        // Get dagen from database
        const dagen = await dbService.getDagen();

        // Update cache
        dagenCache = dagen;
        cacheTimestamp = now;

        context.log(`Retrieved ${dagen.length} dagen from database`);
        return createSuccessResponse(dagen);

    } catch (error) {
        context.error('Error in getDagen:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('getDagen', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'lookups/dagen',
    handler: getDagen,
});