import axios, {
  AxiosError,
  AxiosInstance,
  CreateAxiosDefaults,
  InternalAxiosRequestConfig,
} from "axios";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { ExternalServiceError } from "./http-error";

export interface HttpClientOptions {
  name: string;
  baseURL?: string;
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
}

const IDEMPOTENT_METHODS = new Set(["get", "head", "options", "put", "delete"]);
const RETRIABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

type RetryConfig = InternalAxiosRequestConfig & { retryCount?: number };

const startTimes = new WeakMap<object, number>();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function safeUrl(config: InternalAxiosRequestConfig): string {
  const base = config.baseURL ?? "";
  const path = (config.url ?? "").split(/[?#]/)[0];
  return `${base}${path}`;
}

export function createHttpClient(options: HttpClientOptions): AxiosInstance {
  const { name, baseURL, headers } = options;
  const timeout = options.timeoutMs ?? env.HTTP_TIMEOUT_MS;
  const retries = options.retries ?? 2;

  const defaults: CreateAxiosDefaults = { baseURL, timeout, headers };
  const client = axios.create(defaults);

  client.interceptors.request.use((config) => {
    startTimes.set(config, Date.now());
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      const started = startTimes.get(response.config);
      logger.debug(
        {
          service: name,
          method: response.config.method?.toUpperCase(),
          url: safeUrl(response.config),
          status: response.status,
          ms: started ? Date.now() - started : undefined,
        },
        "http request succeeded",
      );
      return response;
    },
    async (error: AxiosError) => {
      const config = error.config as RetryConfig | undefined;
      const status = error.response?.status;
      const method = config?.method?.toLowerCase() ?? "get";
      const isTransient =
        !error.response ||
        (status !== undefined && RETRIABLE_STATUSES.has(status));

      if (config && isTransient && IDEMPOTENT_METHODS.has(method)) {
        const attempt = config.retryCount ?? 0;
        if (attempt < retries) {
          config.retryCount = attempt + 1;
          const backoff = 300 * 2 ** attempt + Math.floor(Math.random() * 100);
          logger.warn(
            {
              service: name,
              url: safeUrl(config),
              attempt: attempt + 1,
              backoff,
            },
            "retrying http request",
          );
          await sleep(backoff);
          return client(config);
        }
      }

      const started = config ? startTimes.get(config) : undefined;
      logger.error(
        {
          service: name,
          method: config?.method?.toUpperCase(),
          url: config ? safeUrl(config) : undefined,
          status,
          code: error.code,
          ms: started ? Date.now() - started : undefined,
        },
        "http request failed",
      );

      throw new ExternalServiceError(name, undefined, {
        upstreamStatus: status,
      });
    },
  );

  return client;
}
