import { Title } from '@solidjs/meta';
import { Loading } from 'solid-js';
import { DpuSupportBanner } from './components/dpu-support';
import { Footer } from './components/footer';
import { Header } from './components/header';
import { NoJsToggle } from './components/no-js-toggle';
import { Router } from './router';
import './styles.css';

export default function App() {
  return (
    <Router>
      {(props) => (
        <div class="min-h-svh bg-zinc-50 font-['Nunito'] text-zinc-900">
          <Title>DPU · Solid streaming</Title>
          <Header />
          <div class="mx-auto flex max-w-5xl flex-col gap-4 px-6 pt-6">
            <DpuSupportBanner />
            <NoJsToggle />
          </div>
          <main class="mx-auto max-w-5xl px-6 py-10">
            <Loading fallback={null}>{props.children}</Loading>
          </main>
          <Footer />
        </div>
      )}
    </Router>
  );
}
