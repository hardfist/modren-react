import { useEffect } from "react";
/* eslint-disable no-loop-func */
import { useState, useMemo, useRef } from "react";
import produce, { Draft } from "immer";
export type Writeable<T> = { -readonly [P in keyof T]: T[P] };

type AttachEffectsLoading<T> = {
  loadingEffects: { [key in keyof T]: boolean };
};

type ModelConfig<
  S extends { [key: string]: any },
  R extends { [key: string]: Function },
  E extends { [key: string]: Function },
  C extends Omit<{ [key: string]: () => any }, keyof S> &
    { [key in keyof S]+?: never }
> = {
  name?: string;
  state: S;
  computed?: C & ThisType<Readonly<S>>;
  reducers?: R & ThisType<Writeable<S>>;
  effects?: E & ThisType<Readonly<S> & Readonly<R> & Readonly<E>>;
};

type ExtractComputed<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => infer B ? B : never
};
const devTool = connectDevTools();
export function useModel<
  S extends { [key: string]: any },
  R extends { [key: string]: Function },
  E extends { [key: string]: Function },
  C extends Omit<{ [key: string]: () => any }, keyof S> &
    { [key in keyof S]+?: never }
>(
  model: ModelConfig<S, R, E, C>
): [
  Readonly<
    Omit<S, "loadingEffects"> &
      AttachEffectsLoading<E> &
      Omit<ExtractComputed<C>, keyof S>
  >,
  R &
    E & {
      setState(f: (args: Writeable<S>) => void): void;
    }
] {
  const {
    name = "woody-hooks",
    state: stateInModel,
    reducers: reducersInModel = {} as R,
    effects: effectsInModel = {} as E,
    computed: computedInModels = {} as C
  } = model;
  const [state, setState] = useState(stateInModel);
  useEffect(() => {
    sendAction({
      type: `${name}:@@INIT`,
      state: stateInModel
    });
  }, []); // eslint-disable-line
  const [loadingEffects, setLoadingEffects] = useState(() => {
    return Object.keys(effectsInModel).reduce(
      (rtn, key) => {
        // @ts-ignore
        rtn[key] = false;
        return rtn;
      },
      {} as { [key in keyof E]: boolean }
    );
  });

  const stateRef = useRef(state);
  const onceRef = useRef(false);
  const contextRef: any = useRef({ ...stateRef.current });

  const { current: actions } = useRef(
    (() => {
      if (onceRef.current) {
        return;
      }
      onceRef.current = true;
      const reducers: any = {};
      const enhancedReducers = {
        ...reducersInModel,
        setState(f: any) {
          f(this);
        }
      };
      for (const [key, reducerFn] of Object.entries(enhancedReducers)) {
        reducers[key] = (...args: any[]) => {
          const next = produce(stateRef.current, (draft: any) => {
            reducerFn.apply(draft, args);
            sendAction({
              type: `${name}:${reducerFn.name}`,
              payload: args.length === 1 ? args[0] : args,
              state: draft
            });
          });
          stateRef.current = next;
          Object.assign(contextRef.current, next);
          setState(next);

          return next;
        };
      }
      Object.assign(contextRef.current, reducers);
      const effects: any = {};
      for (const [key, effectFn] of Object.entries(effectsInModel)) {
        effects[key] = (() => {
          let renderId = 0;
          return (...args: any[]) => {
            renderId = ++renderId % 200; // 用来标记最新的一次 render，避免连续调用 setLoadingEffects false
            const currentId = renderId;
            let effectResult: any;
            effectResult = effectFn.apply(contextRef.current, args);

            // 如果是个 Promise
            if (effectResult && typeof effectResult.then === "function") {
              setLoadingEffects(s => ({ ...s, [key]: true }));
              effectResult
                .then(() => {
                  if (renderId !== currentId) {
                    return;
                  }
                  setLoadingEffects(s => ({ ...s, [key]: false }));
                })
                .catch(e => {
                  if (renderId !== currentId) {
                    return;
                  }
                  setLoadingEffects(s => ({ ...s, [key]: false }));
                  throw e;
                });
            }
            return effectResult;
          };
        })();
      }
      Object.assign(contextRef.current, reducers, effects);
      return { ...reducers, ...effects } as any;
    })()
  ); // eslint-disable-line

  const stateAndComputed = useMemo(() => {
    const computed: any = {};
    for (const [key, computeFn] of Object.entries(computedInModels)) {
      // @ts-ignore
      computed[key] = computeFn.call(state);
    }
    return { ...state, ...computed, loadingEffects } as any;
  }, [state, loadingEffects]); // eslint-disable-line

  return [stateAndComputed, actions];
}

function connectDevTools() {
  try {
    return (window as any).__REDUX_DEVTOOLS_EXTENSION__.connect();
  } catch (err) {
    // just ignore
  }
}
function sendAction({
  type,
  payload,
  state
}: {
  type: string;
  payload?: any;
  state: any;
}) {
  if (devTool) {
    try {
      devTool.send(
        {
          type,
          payload
        },
        JSON.parse(JSON.stringify(state))
      );
    } catch (err) {
      console.warn("redux devtools send error", err);
    }
  }
}
