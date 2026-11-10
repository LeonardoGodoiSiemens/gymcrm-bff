import * as fs from 'fs';
import * as path from 'path';

/**
 * Architecture tests: enforce Clean Architecture dependency rules
 * and Vertical Slice organisation by scanning the import statements in src/.
 */
const SRC = path.resolve(__dirname, '../../src');

function listFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? listFiles(full) : full.endsWith('.ts') ? [full] : [];
  });
}

interface Import { file: string; spec: string; targetLayer: string | null; targetPath: string | null }

function importsOf(file: string): Import[] {
  const text = fs.readFileSync(file, 'utf8');
  const specs = [...text.matchAll(/(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  return specs.map((spec) => {
    if (!spec.startsWith('.')) return { file, spec, targetLayer: null, targetPath: null };
    const resolved = path.resolve(path.dirname(file), spec);
    const rel = path.relative(SRC, resolved);
    return { file, spec, targetLayer: rel.split(path.sep)[0], targetPath: rel };
  });
}

const layerFiles = (layer: string) => listFiles(path.join(SRC, layer));
const rel = (f: string) => path.relative(SRC, f);

describe('Architecture rules', () => {
  it('Domain must not depend on any other layer or external package (Node built-ins allowed)', () => {
    const NODE_BUILTINS = ['crypto', 'async_hooks'];
    const violations = layerFiles('domain')
      .flatMap(importsOf)
      .filter((i) => (i.targetLayer === null ? !NODE_BUILTINS.includes(i.spec) : i.targetLayer !== 'domain'));
    expect(violations.map((v) => `${rel(v.file)} -> ${v.spec}`)).toEqual([]);
  });

  it('Application depends only on Domain (and @nestjs/common for DI)', () => {
    const violations = layerFiles('application')
      .flatMap(importsOf)
      .filter((i) =>
        i.targetLayer === null
          ? i.spec !== '@nestjs/common'
          : !['domain', 'application'].includes(i.targetLayer),
      );
    expect(violations.map((v) => `${rel(v.file)} -> ${v.spec}`)).toEqual([]);
  });

  it('Infrastructure must not depend on Api', () => {
    const violations = layerFiles('infrastructure').flatMap(importsOf).filter((i) => i.targetLayer === 'api');
    expect(violations.map((v) => `${rel(v.file)} -> ${v.spec}`)).toEqual([]);
  });

  it('Api only reaches Infrastructure from module / health composition files', () => {
    const allowed = ['bff.module.ts'];
    const violations = layerFiles('api')
      .flatMap(importsOf)
      .filter((i) => i.targetLayer === 'infrastructure' && !allowed.includes(path.basename(i.file)));
    expect(violations.map((v) => `${rel(v.file)} -> ${v.spec}`)).toEqual([]);
  });

  it('Vertical slices: features must not import other features', () => {
    const violations = layerFiles('application/features')
      .flatMap(importsOf)
      .filter((i) => {
        if (!i.targetPath || !i.targetPath.startsWith(`application${path.sep}features`)) return false;
        const ownFeature = rel(i.file).split(path.sep)[2];
        const targetFeature = i.targetPath.split(path.sep)[2];
        return ownFeature !== targetFeature;
      });
    expect(violations.map((v) => `${rel(v.file)} -> ${v.spec}`)).toEqual([]);
  });

  it('Vertical slices: every feature folder contains a *.handler.ts', () => {
    const featuresDir = path.join(SRC, 'application/features');
    const folders = fs.readdirSync(featuresDir, { withFileTypes: true }).filter((e) => e.isDirectory());
    expect(folders.length).toBeGreaterThanOrEqual(3);
    for (const f of folders) {
      const files = fs.readdirSync(path.join(featuresDir, f.name));
      expect(files.some((n) => n.endsWith('.handler.ts'))).toBe(true);
    }
  });

  it('Layers exist: domain, application, infrastructure, api', () => {
    for (const layer of ['domain', 'application', 'infrastructure', 'api']) {
      expect(fs.existsSync(path.join(SRC, layer))).toBe(true);
    }
  });
});
