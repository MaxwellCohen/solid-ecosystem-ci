import { For, Show } from 'solid-js';
import { query } from '../lib/query';
import { groups, scenarios, type Scenario } from './scenarios';

const link = 'text-sky-700 underline-offset-2 hover:underline';

export function selected(): Scenario[] {
  const q = query();
  const only = q.getAll('only');
  const group = q.get('group');
  if (only.length) return scenarios.filter((s) => only.includes(s.id));
  return scenarios.filter((s) => !group || s.group === group);
}

export function Harness(props: { diag?: boolean; list?: Scenario[] }) {
  const q = query();
  const list = () => props.list ?? selected();
  const chosen = () => q.getAll('only');
  const checked = (s: Scenario) => (chosen().length ? chosen().includes(s.id) : true);
  const off = q.get('hydrate') === 'off';
  const sc = q.get('scale') ?? '1';
  return (
    <div class="w-full text-[15px]">
      <p class="text-[13px] text-zinc-600">
        variant <code>solid-2</code> · Solid 2.0 · <code>Loading</code> → <code>&lt;?start name&gt;</code> /{' '}
        <code>&lt;template for&gt;</code> (native DPU)
      </p>
      <nav class="mt-1">
        <a class={link} href="/">all</a>{' '}
        <a class={link} href="/dpu">dpu diagnostics</a>{' '}
        <For each={groups}>{(g) => <><a class={link} href={`/?group=${g}`}>{g}</a>{' '}</>}</For>
        | hydrate: <a class={link} href="?hydrate=on">on</a>{' '}
        <a class={link} href="?hydrate=off">off</a>
      </nav>

      <Show when={props.diag}>
        <section id="dpu-diag" class="my-3 rounded-[10px] border border-zinc-200 bg-white px-3.5 py-2.5">
          <h2 class="font-bold">DPU diagnostics</h2>
          <table><tbody id="dpu-rows" /></table>
          <details><summary>per-call log</summary><pre id="dpu-log" class="max-h-48 overflow-auto text-xs" /></details>
          <script src="/dpu-diag.js" defer />
        </section>
      </Show>

      <details id="controls" open class="my-3 rounded-[10px] border border-zinc-200 bg-white px-3.5 py-2.5">
        <summary class="cursor-pointer font-semibold">Choose scenarios &amp; options</summary>
        <form method="get" action="/" class="text-[13px]">
          <fieldset class="my-2 rounded-lg border border-zinc-200 px-2.5 py-1.5">
            <legend class="text-zinc-600">Hydration</legend>
            <label class="mr-3"><input type="radio" name="hydrate" value="on" checked={!off} /> on</label>
            <label class="mr-3"><input type="radio" name="hydrate" value="off" checked={off} /> off (no JS)</label>
          </fieldset>
          <fieldset class="my-2 rounded-lg border border-zinc-200 px-2.5 py-1.5">
            <legend class="text-zinc-600">Speed (delay ×)</legend>
            <For each={['1', '2', '3', '5']}>
              {(v) => <label class="mr-3"><input type="radio" name="scale" value={v} checked={sc === v} /> ×{v}</label>}
            </For>
          </fieldset>
          <For each={groups}>
            {(g) => (
              <fieldset class="my-2 rounded-lg border border-zinc-200 px-2.5 py-1.5">
                <legend class="text-zinc-600">
                  {g} <a href="#" class={link} data-sel={`${g}:1`}>all</a> / <a href="#" class={link} data-sel={`${g}:0`}>none</a>
                </legend>
                <div class="columns-2">
                  <For each={scenarios.filter((s) => s.group === g)}>
                    {(s) => (
                      <label class="block" title={s.expected}>
                        <input type="checkbox" name="only" value={s.id} data-g={g} checked={checked(s)} /> {s.title}
                      </label>
                    )}
                  </For>
                </div>
              </fieldset>
            )}
          </For>
          <div class="sticky bottom-0 bg-white py-2">
            <button type="submit" class="rounded border border-zinc-400 px-2.5 py-1">Run selected</button>{' '}
            <a class={link} href="/">reset</a>
          </div>
        </form>
        <script src="/controls.js" defer />
      </details>

      <h1 class="mt-4 text-2xl font-bold">Solid streaming: dpu</h1>
      <p class="text-[13px] text-zinc-600">{list().length} scenarios</p>
      <ol class="columns-2 pl-5 text-[13px]">
        <For each={list()}>{(s) => <li><a class={link} href={`#${s.id}`}>{s.title}</a></li>}</For>
      </ol>
      <For each={list()}>
        {(s) => (
          <section id={s.id} data-scenario={s.id} class="my-3 rounded-[10px] border border-zinc-200 bg-white p-3">
            <h3 class="mb-1.5 font-bold">
              {s.title}
              <small class="ml-1.5 font-normal text-zinc-500">{s.id}</small>
            </h3>
            <p class="my-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[13px]">{s.expected}</p>
            <div data-slot="stage" class="min-h-8 overflow-auto rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-2.5">
              {s.render()}
            </div>
          </section>
        )}
      </For>
    </div>
  );
}
