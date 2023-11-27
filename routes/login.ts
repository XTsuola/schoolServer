// deno-lint-ignore-file
import { Router } from "https://deno.land/x/oak@v10.2.1/router.ts";
import { add, findLast, queryOne, update } from "../mongoDB/index.ts";
import { create } from "https://deno.land/x/djwt@v2.7/mod.ts";
import { key } from "../verifyToken/key.ts";
import { Document } from "https://deno.land/x/mongo@v0.29.3/mod.ts";
import { decode } from "https://deno.land/std@0.138.0/encoding/base64.ts";

export function login(router: Router) {
  router.post("/register_user", async (ctx): Promise<void> => { // 注册用户
    const params: any = await ctx.request.body({
      type: "json",
    }).value;

    const sql0 = { email: params.email, status: true };
    const data0: Document | undefined = await queryOne(sql0, "user");
    if (data0 != undefined) {
      ctx.response.body = {
        "code": 500,
        "msg": "该账号已注册",
      };
    } else {
      const lastInfo: Document[] = await findLast("user");
      let id: number = 0;
      if (lastInfo.length) {
        id = lastInfo[0].id;
      }
      id++;
      const imgName: string = id + "_" + Date.now() + ".jpg";
      const path = `${Deno.cwd()}/public/headImg/${imgName}`;
      const base64: any = params.img.replace(/^data:image\/\w+;base64,/, "");
      const dataBuffer: Uint8Array = decode(base64);
      await Deno.writeFile(path, dataBuffer);
      const sql = {
        id: id,
        username: params.username,
        email: params.email,
        password: params.password,
        img: imgName,
        tag: params.tag,
        online: false,
        status: true,
      };
      const data: any = await add(sql, "user");
      ctx.response.body = {
        "code": 200,
        "rows": data,
        "msg": "新增成功",
      };
    }
  }).post("/login", async (ctx): Promise<void> => { // 登录
    const params: any = await ctx.request.body({
      type: "json",
    }).value;
    const sql = { email: params.email, status: true };
    const data: Document | undefined = await queryOne(sql, "user");
    if (data) {
      if (data.password == params.password) {
        const jwt: string = await create({ alg: "HS512", typ: "JWT" }, {
          account: params.email,
          date: Date.now(),
        }, key);
        const data2 = {
          _id: data._id,
          id: data.id,
          username: data.username,
          img: data.img,
          token: jwt,
        };
        const sql2 = { email: params.email };
        const data3: Document | undefined = await queryOne(sql2, "token");
        if (data3) {
          const param1 = { email: data3.email };
          const param2 = { token: jwt };
          await update(param1, param2, "token");
        } else {
          const lastInfo: Document[] = await findLast("token");
          let id: number = 0;
          if (lastInfo.length) {
            id = lastInfo[0].id;
          }
          const sql3 = {
            id: id + 1,
            email: params.email,
            token: jwt,
          };
          await add(sql3, "token");
        }
        ctx.response.body = {
          "code": 200,
          "data": data2,
          "msg": "登录成功",
        };
      } else {
        ctx.response.body = {
          "code": 0,
          "msg": "密码错误",
        };
      }
    } else {
      ctx.response.body = {
        "code": 0,
        "msg": "账号不存在",
      };
    }
  });
}
