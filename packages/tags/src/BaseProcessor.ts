/* eslint-disable class-methods-use-this */
import type { types as t } from '@babel/core';
import generator from '@babel/generator';
import type {
  Expression,
  Identifier,
  SourceLocation,
  MemberExpression,
} from '@babel/types';

import type {
  ExpressionValue,
  IInterpolation,
  Params,
  Value,
  ValueCache,
  Artifact,
} from './types';
import getClassNameAndSlug from './utils/getClassNameAndSlug';
import hasMeta from './utils/hasMeta';
import { isCSSable } from './utils/toCSS';
import type { IFileContext, IOptions } from './utils/types';
import { validateParams } from './utils/validateParams';

export { Expression };

export type ProcessorParams = ConstructorParameters<typeof BaseProcessor>;
export type TailProcessorParams = ProcessorParams extends [Params, ...infer T]
  ? T
  : never;

export default abstract class BaseProcessor {
  public static SKIP = Symbol('skip');

  public readonly artifacts: Artifact[] = [];

  public readonly className: string;

  public readonly dependencies: ExpressionValue[] = [];

  public interpolations: IInterpolation[] = [];

  public readonly slug: string;

  protected tag: Identifier | MemberExpression;

  protected evaluated:
    | Record<'dependencies' | 'expression', Value[]>
    | undefined;

  public constructor(
    params: Params,
    protected readonly astService: typeof t & {
      addNamedImport: (name: string, source: string) => Identifier;
    },
    public readonly location: SourceLocation | null,
    protected readonly replacer: (
      replacement: Expression,
      isPure: boolean
    ) => void,
    public readonly displayName: string,
    public readonly isReferenced: boolean,
    protected readonly idx: number,
    protected readonly options: IOptions,
    protected readonly context: IFileContext
  ) {
    validateParams(
      params,
      ['tag'],
      'Unknown error: a tag param is not specified'
    );

    const { className, slug } = getClassNameAndSlug(
      this.displayName,
      this.idx,
      this.options,
      this.context
    );

    this.className = className;
    this.slug = slug;

    [[, this.tag]] = params;
  }

  public abstract build(values: ValueCache): void;

  public isValidValue(value: unknown): value is Value {
    return typeof value === 'function' || isCSSable(value) || hasMeta(value);
  }

  /**
   * Perform a replacement for the tag in evaluation time.
   * For example, `css` tag will be replaced with its className,
   * whereas `styled` tag will be replaced with an object with metadata.
   */
  public abstract doEvaltimeReplacement(): void;

  /**
   * Perform a replacement for the tag with its runtime version.
   * For example, `css` tag will be replaced with its className,
   * whereas `styled` tag will be replaced with a component.
   * If some parts require evaluated data for render,
   * they will be replaced with placeholders.
   */
  public abstract doRuntimeReplacement(): void;

  /**
   * A replacement for tag referenced in a template literal.
   */
  public abstract get asSelector(): string;

  /**
   * A replacement for the tag in evaluation time.
   * For example, `css` tag will be replaced with its className,
   * whereas `styled` tag will be replaced with an object with metadata.
   */
  public abstract get value(): Expression;

  protected tagSourceCode(): string {
    if (this.tag.type === 'Identifier') {
      return this.tag.name;
    }

    return generator(this.tag).code;
  }

  public toString(): string {
    return this.tagSourceCode();
  }
}
