import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentWorkspace = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const workspaceId = request.workspaceId || request.headers['x-workspace-id'];
    return data ? request.workspace?.[data] : workspaceId;
  },
);
