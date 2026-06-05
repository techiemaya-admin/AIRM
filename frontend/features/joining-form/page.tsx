/**
 * New Joining Form Page
 * Comprehensive employee onboarding form with multiple sections
 */

import { useParams } from "react-router-dom";
import JoiningForm from "./JoiningForm";


const JoiningFormPage = () => {
  const { id } = useParams<{ id: string }>();
  // If id is 'create', treat as new form (no profileId)
  const profileId = id === 'create' ? undefined : id;
  return <JoiningForm profileId={profileId} />;
};

export default JoiningFormPage;
