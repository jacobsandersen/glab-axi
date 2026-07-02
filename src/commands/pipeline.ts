import { encode } from '@toon-format/toon';
import type { RepoContext } from '../context.js';
import { glabJson, glabExec } from '../glab.js';
import { AxiError } from '../errors.js';
import { getFlag, hasFlag } from '../args.js';
import {
  field,
  lower,
  relativeTime,
  renderList,
  renderDetail,
  renderHelp,
  renderOutput,
  renderError,
  type FieldDef,
} from '../toon.js';
import { formatCountLine } from '../format.js';
import { getSuggestions } from '../suggestions.js';

export const PIPELINE_HELP = `usage: glab-axi pipeline <subcommand> [flags]
subcommands[5]:
  list, view <id>, retry <id>, cancel <id>, delete <id>
flags{list}:
  --status <running|pending|success|failed|canceled|skipped>, --ref, --per-page <n> (default 20)
flags{view}:
  (none)
examples:
  glab-axi pipeline list --status failed
  glab-axi pipeline view 12345
  glab-axi pipeline retry 12345`;

const listSchema: FieldDef[] = [
  field('id'),
  lower('status'),
  field('ref'),
  relativeTime('created_at', 'created'),
  field('sha', 'sha'),
];

const viewSchema: FieldDef[] = [
  field('id'),
  lower('status'),
  field('ref'),
  field('sha'),
  relativeTime('created_at', 'created'),
  relativeTime('updated_at', 'updated'),
  field('web_url', 'url'),
];

async function listPipelines(args: string[], ctx?: RepoContext): Promise<string> {
  const perPage = getFlag(args, '--per-page') ?? '20';
  const ghArgs = [
    'pipeline', 'list',
    '--json', 'id,status,ref,created_at,sha',
    '--per-page', perPage,
  ];
  const status = getFlag(args, '--status');
  if (status) ghArgs.push('--status', status);
  const ref = getFlag(args, '--ref');
  if (ref) ghArgs.push('--ref', ref);

  const pipelines = await glabJson<Record<string, unknown>[]>(ghArgs, ctx);
  const isEmpty = pipelines.length === 0;
  const limitNum = Number(perPage);
  const countLine = formatCountLine({ count: pipelines.length, limit: limitNum });
  const suggestions = getSuggestions({ domain: 'pipeline', action: 'list', isEmpty, repo: ctx });
  return renderOutput([
    countLine,
    renderList('pipelines', pipelines, listSchema),
    renderHelp(suggestions),
  ]);
}

async function viewPipeline(args: string[], ctx?: RepoContext): Promise<string> {
  const positionals = args.filter((a) => !a.startsWith('--'));
  const id = positionals[1];
  if (!id) throw new AxiError('Pipeline ID is required: glab-axi pipeline view <id>', 'VALIDATION_ERROR');

  const pipeline = await glabJson<Record<string, unknown>>(
    ['pipeline', 'view', id, '--json', 'id,status,ref,sha,created_at,updated_at,web_url'],
    ctx,
  );

  const state = typeof pipeline.status === 'string' ? pipeline.status.toLowerCase() : 'unknown';

  return renderOutput([
    renderDetail('pipeline', pipeline, viewSchema),
    renderHelp(
      getSuggestions({ domain: 'pipeline', action: 'view', state, id, repo: ctx }),
    ),
  ]);
}

async function retryPipeline(args: string[], ctx?: RepoContext): Promise<string> {
  const positionals = args.filter((a) => !a.startsWith('--'));
  const id = positionals[1];
  if (!id) throw new AxiError('Pipeline ID is required: glab-axi pipeline retry <id>', 'VALIDATION_ERROR');

  await glabExec(['pipeline', 'retry', id], ctx);
  const suggestions = getSuggestions({ domain: 'pipeline', action: 'retry', id, repo: ctx });
  return renderOutput([
    encode({ retry: 'ok', pipeline: id }),
    renderHelp(suggestions),
  ]);
}

async function cancelPipeline(args: string[], ctx?: RepoContext): Promise<string> {
  const positionals = args.filter((a) => !a.startsWith('--'));
  const id = positionals[1];
  if (!id) throw new AxiError('Pipeline ID is required: glab-axi pipeline cancel <id>', 'VALIDATION_ERROR');

  await glabExec(['pipeline', 'cancel', id], ctx);
  const suggestions = getSuggestions({ domain: 'pipeline', action: 'cancel', id, repo: ctx });
  return renderOutput([
    encode({ cancel: 'ok', pipeline: id }),
    renderHelp(suggestions),
  ]);
}

async function deletePipeline(args: string[], ctx?: RepoContext): Promise<string> {
  const positionals = args.filter((a) => !a.startsWith('--'));
  const id = positionals[1];
  if (!id) throw new AxiError('Pipeline ID is required: glab-axi pipeline delete <id>', 'VALIDATION_ERROR');

  await glabExec(['pipeline', 'delete', id], ctx);
  const suggestions = getSuggestions({ domain: 'pipeline', action: 'delete', id, repo: ctx });
  return renderOutput([
    encode({ delete: 'ok', pipeline: id }),
    renderHelp(suggestions),
  ]);
}

export async function pipelineCommand(args: string[], ctx?: RepoContext): Promise<string> {
  const sub = args[0];

  if (sub === '--help' || sub === undefined) return PIPELINE_HELP;

  switch (sub) {
    case 'list':
      return listPipelines(args, ctx);
    case 'view':
      return viewPipeline(args, ctx);
    case 'retry':
      return retryPipeline(args, ctx);
    case 'cancel':
      return cancelPipeline(args, ctx);
    case 'delete':
      return deletePipeline(args, ctx);
    default:
      return renderError(`Unknown subcommand: ${sub}`, 'VALIDATION_ERROR', [
        'Available subcommands: list, view, retry, cancel, delete',
      ]);
  }
}
