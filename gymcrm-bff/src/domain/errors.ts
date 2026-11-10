/** Falha ao falar com um serviço a jusante (microsserviço ou Function). */
export class UpstreamError extends Error {
  constructor(
    public readonly service: string,
    /** Status HTTP devolvido pelo serviço; 0 quando não houve resposta (rede/timeout). */
    public readonly status: number,
    public readonly body: unknown,
    message?: string,
  ) {
    super(message ?? `${service} responded with status ${status}`);
    this.name = 'UpstreamError';
  }

  get unavailable(): boolean {
    return this.status === 0;
  }
}
