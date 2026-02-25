import { TestDetailClient } from "./test-detail-client";

/**
 * Test Detail Page (Admin)
 * Route: /tests/[id]
 */
interface TestDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function TestDetailPage({ params }: TestDetailPageProps) {
    const { id } = await params;
    return <TestDetailClient testId={id} />;
}
