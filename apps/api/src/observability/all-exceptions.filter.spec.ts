import { AllExceptionsFilter } from "./all-exceptions.filter.js";
import { HttpException, HttpStatus } from "@nestjs/common";

function mockHost(send = jest.fn()) {
  const reply = { status: jest.fn().mockReturnThis(), send };
  return {
    switchToHttp: () => ({
      getResponse: () => reply,
      getRequest: () => ({ url: "/v1/x", id: "req-1" }),
    }),
  } as never;
}

describe("AllExceptionsFilter", () => {
  it("preserves HttpException status and does not report 4xx to Sentry", () => {
    const capture = jest.fn();
    const filter = new AllExceptionsFilter(capture);
    const send = jest.fn();
    filter.catch(new HttpException("nope", HttpStatus.BAD_REQUEST), mockHost(send));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(capture).not.toHaveBeenCalled();
  });

  it("reports unknown (500) errors to Sentry", () => {
    const capture = jest.fn();
    const filter = new AllExceptionsFilter(capture);
    filter.catch(new Error("boom"), mockHost(jest.fn()));
    expect(capture).toHaveBeenCalledTimes(1);
  });
});
