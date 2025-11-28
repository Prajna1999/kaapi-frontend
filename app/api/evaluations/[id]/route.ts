import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Set to true to use mock data, false to use real backend
const USE_MOCK_DATA = false;

/**
 * GET /api/evaluations/[id]
 * Fetches a single evaluation job by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const apiKey = request.headers.get('X-API-KEY');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing X-API-KEY' }, { status: 401 });
    }

    const { id } = await params;

    // Mock data mode
    if (USE_MOCK_DATA) {
      try {
        // Map IDs to mock files
        let mockFileName = 'evaluation-sample-1.json';
        if (id === '44' || id === '2') {
          mockFileName = 'evaluation-sample-2.json';
        } else if (id === '10' || id === '3') {
          // Use the new schema for ID 10 (from the JSON) or ID 3
          mockFileName = 'evaluation-sample-3.json';
        }

        const filePath = path.join(process.cwd(), 'public', 'mock-data', mockFileName);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const mockData = JSON.parse(fileContent);

        console.log(`[MOCK MODE] Returning mock data for ID ${id} from ${mockFileName}`);
        return NextResponse.json(mockData, { status: 200 });
      } catch (err) {
        console.error('Error reading mock data:', err);
        return NextResponse.json(
          { error: 'Mock data not found', details: err.message },
          { status: 404 }
        );
      }
    }

    // Real backend mode
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Build URL with default query parameters
    const url = new URL(`${backendUrl}/api/v1/evaluations/${id}`);
    url.searchParams.set('get_trace_info', 'true');
    url.searchParams.set('resync_score', 'false');

    console.log(`[REAL BACKEND] Fetching evaluation ${id} from ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[REAL BACKEND] Error response: ${errorText}`);
      return NextResponse.json(
        { error: `Backend error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Validate that we received valid data
    if (!data || typeof data !== 'object') {
      console.error('[REAL BACKEND] Invalid response format');
      return NextResponse.json(
        { error: 'Invalid response format from backend' },
        { status: 500 }
      );
    }

    console.log(`[REAL BACKEND] Successfully fetched evaluation ${id}`);
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evaluation', details: error.message },
      { status: 500 }
    );
  }
}
