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
      async (ctx): Promise<void> => { // websocket修改用户在线信息
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
    ).post(
      "/webSocketSendMessage",
      async (ctx): Promise<void> => { // websocket发送消息
        const params: any = await ctx.request.body({
          type: "json",
        }).value;
        const list: any = [{ ids: parseInt(params.id) }, {
          ids: parseInt(params.friendId),
        }];
        const sql = { $and: list };
        const res: any = await queryOne(sql, "user_relation");
        const sql2 = { id: res._id };
        const res2: any = await queryOne(sql2, "user_message");
        if (res2) {
          const data1 = { _id: res2._id };
          const data2 = {
            info: [...res2.info, {
              id: parseInt(params.id),
              msg: params.info,
              time: new Date(),
              status: true,
            }],
          };
          await update(data1, data2, "user_message");
          ctx.response.body = {
            "code": 200,
            "data": data2.info
          };
        } else {
          const sql3 = {
            id: res._id,
            info: [{
              id: parseInt(params.id),
              msg: params.info,
              time: new Date(),
              status: true,
            }],
          };
          await add(sql3, "user_message");
          ctx.response.body = {
            "code": 200,
            "data": sql3.info,
          };
        }
      },
    );
}
