import { use } from "react";
import { TestClient } from "./test-client";

/**
 * Candidate Test Page
 * Route: /test/[testId]
 */
interface TestPageProps {
    params: Promise<{ testId: string }>;
}

export default function TestPage({ params }: TestPageProps) {
    const { testId } = use(params);
    return <TestClient testId={testId} />;
}
