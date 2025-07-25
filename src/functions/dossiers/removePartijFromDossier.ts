import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { getUserId } from '../../utils/auth-helper';

export async function removePartijFromDossier(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        // Get user ID from auth
        const userId = getUserId(request);
        if (!userId) {
            return createErrorResponse('Unauthorized', 401);
        }

        // Get dossier ID and partij ID from route
        const dossierId = parseInt(request.params.dossierId || '');
        const partijId = parseInt(request.params.partijId || '');
        
        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }
        
        if (!partijId || isNaN(partijId)) {
            return createErrorResponse('Invalid partij ID', 400);
        }

        // Initialize database
        await dbService.initialize();

        // Check dossier access
        const hasAccess = await dbService.checkDossierAccess(dossierId, userId);
        if (!hasAccess) {
            return createErrorResponse('Access denied', 403);
        }

        // Check if partij exists in this dossier
        const partijData = await dbService.getPartijById(dossierId, partijId);
        if (!partijData) {
            return createErrorResponse('Partij not found in this dossier', 404);
        }

        // Remove partij from dossier
        const success = await dbService.removePartijFromDossier(dossierId, partijId);
        
        if (!success) {
            return createErrorResponse('Failed to remove partij from dossier', 500);
        }

        context.log(`Removed partij ${partijId} from dossier ${dossierId}`);
        return createSuccessResponse({ success: true });

    } catch (error) {
        context.error('Error in removePartijFromDossier:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('removePartijFromDossier', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/partijen/{partijId}',
    handler: removePartijFromDossier,
});