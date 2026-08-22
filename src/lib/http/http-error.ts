import { AppError } from "../../utils/app-error";

export class ExternalServiceError extends AppError {
  public readonly service: string;
  public readonly upstreamStatus?: number;

  constructor(
    service: string,
    message = "Upstream service request failed",
    options: { upstreamStatus?: number } = {},
  ) {
    super(message, 502);
    this.service = service;
    this.upstreamStatus = options.upstreamStatus;
  }
}
