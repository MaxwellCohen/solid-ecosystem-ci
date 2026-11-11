import { Title } from '@solidjs/meta';
import { Harness } from '../components/harness';

export default function Dpu() {
  return (
    <>
      <Title>Solid streaming — dpu diagnostics</Title>
      <Harness diag />
    </>
  );
}
