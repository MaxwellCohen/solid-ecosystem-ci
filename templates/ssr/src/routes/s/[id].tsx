import { Title } from '@solidjs/meta';
import { useParams } from '@solidjs/router';
import { Harness } from '../../components/harness';
import { scenarios } from '../../components/scenarios';

export default function ScenarioPage() {
  const params = useParams();
  return (
    <>
      <Title>{`${params.id} — Solid streaming`}</Title>
      <Harness list={scenarios.filter((s) => s.id === params.id)} />
    </>
  );
}
