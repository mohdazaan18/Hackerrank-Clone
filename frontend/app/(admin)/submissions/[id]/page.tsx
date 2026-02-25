import { use } from "react";
import { SubmissionClient } from "./submission-client";

/**
 * Submission Detail Page (Admin)
 * Route: /submissions/[id]
 */
interface SubmissionDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function SubmissionDetailPage({ params }: SubmissionDetailPageProps) {
    const { id } = use(params);
    return <SubmissionClient submissionId={id} />;
}
