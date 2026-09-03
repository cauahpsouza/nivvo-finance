import { ChallengeExperience } from '../components/challenge/ChallengeExperience';
import { ChallengeProvider } from '../context/ChallengeContext';

export default function Home() {
  return <ChallengeProvider><ChallengeExperience /></ChallengeProvider>;
}
