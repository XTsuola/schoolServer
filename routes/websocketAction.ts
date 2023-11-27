// deno-lint-ignore-file
import { Router } from "https://deno.land/x/oak@v10.2.1/router.ts";
import { helpers } from "https://deno.land/x/oak@v10.2.1/mod.ts";
import {
  add,
  deleteData,
  findLast,
  queryAll,
  queryCount,
  queryOne,
  update,
} from "../mongoDB/index.ts";
import { Document, ObjectId } from "https://deno.land/x/mongo@v0.29.3/mod.ts";
import { decode } from "https://deno.land/std@0.138.0/encoding/base64.ts";
import { verifyToken } from "../verifyToken/index.ts";

export function websocketAction(router: Router): void {
  router
    .post(
      "/webSocketEditUser",
      async (ctx): Promise<void> => { // websocket修改用户信息
        const params: any = await ctx.request.body({
          type: "json",
        }).value;
        const param1 = { id: parseInt(params.id) };
        const param2: any = {
          online: params.online,
        };
        const data = await update(param1, param2, "user");
        ctx.response.body = {
          "code": 200,
          "rows": data,
          "msg": "修改成功",
        };
      },
    );
}
