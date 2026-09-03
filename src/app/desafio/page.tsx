import { ChallengeLanding } from '../../components/challenge/ChallengeLanding';
import { externalLinks } from '../../config/externalLinks';

export default function DesafioPage() {
  return <ChallengeLanding challengeUrl={externalLinks.challenge} />;
}
