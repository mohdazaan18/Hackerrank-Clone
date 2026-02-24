import { TestDetailClient } from "./test-detail-client";

/**
 * Test Detail Page (Admin)
 * Route: /tests/[id]
 */
interface TestDetailPageProps {
    params: { id: string };
}

export default function TestDetailPage({ params }: TestDetailPageProps) {
    return <TestDetailClient testId={params.id} />;
}
