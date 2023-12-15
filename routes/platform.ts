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
import { driverMetadata } from "https://deno.land/x/mongo@v0.29.3/src/protocol/mod.ts";

export function platform(router: Router): void {
  router.post(
    "/approvalFriends",
    verifyToken,
    async (ctx): Promise<void> => { // 用户申请添加好友信息
      const params: any = await ctx.request.body({
        type: "json",
      }).value;
      const sql = {
        requestor: params.id,
        recipient: params.friendId,
        askInfo: params.remark,
        rejectInfo: "",
      };
      await add(sql, "user_accept");
      ctx.response.body = {
        "code": 200,
        "msg": "成功",
      };
    },
  ).get("/getAskList", verifyToken, async (ctx): Promise<void> => { // 获取用户请求列表
    const params: any = helpers.getQuery(ctx);
    let sql: any = { recipient: parseInt(params.userId) };
    const total: number = await queryCount(sql, "user_accept");
    const data: Document[] = await queryAll(sql, "user_accept");
    for (let i = 0; i < data.length; i++) {
      const res: any = await queryOne({ id: data[i].requestor }, "user");
      const data2: any = { username: res.username, id: res.id, img: res.img };
      const list = res.tag.map((item: number) => {
        return {
          id: item,
        };
      });
      const sql2 = {
        status: true,
        $or: list,
      };
      const data3: Document[] = await queryAll(sql2, "tag");

      data2.tag = data3;
      data[i].requestor = data2;
    }
    ctx.response.body = {
      "code": 200,
      "rows": data,
      "total": total,
      "msg": "查询成功",
    };
  }).post(
    "/createRelation",
    verifyToken,
    async (ctx): Promise<void> => { // 创建用户关系
      const params: any = await ctx.request.body({
        type: "json",
      }).value;
      const sql = {
        ids: [params.id, params.friendId],
      };
      await add(sql, "user_relation");
      const data1: any = await queryOne({
        requestor: params.id,
        recipient: params.friendId,
      }, "user_accept");
      const data2: any = await queryOne({
        requestor: params.friendId,
        recipient: params.id,
      }, "user_accept");
      const data3 = [data1, data2].filter((item: any) => item != undefined)
        .map((item: any) => item._id);
      for (let i = 0; i < data3.length; i++) {
        await deleteData({ _id: data3[i] }, "user_accept");
      }
      ctx.response.body = {
        "code": 200,
        "msg": "成功",
      };
    },
  ).post(
    "/giveUpRelation",
    async (ctx): Promise<void> => { // 拒绝创建用户关系
      const params: any = await ctx.request.body({
        type: "json",
      }).value;
      const data: any = await queryOne({
        requestor: params.friendId,
        recipient: params.id,
      }, "user_accept");
      await deleteData({ _id: data._id }, "user_accept");
      ctx.response.body = {
        "code": 200,
        "msg": "成功",
      };
    },
  ).get("/getMyFriendList", verifyToken, async (ctx): Promise<void> => { // 获取我的好友列表
    const params: any = helpers.getQuery(ctx);
    let sql: any = { ids: parseInt(params.userId) };
    const res: Document[] = await queryAll(sql, "user_relation");
    let list: any = [];
    for (let i = 0; i < res.length; i++) {
      list = [...list, ...res[i].ids];
    }
    const list2 = list.filter((item: any) => item != parseInt(params.userId));
    const sql2 = { id: { $in: list2 } };
    const res2: any = await queryAll(sql2, "user");
    const data = res2.map((item: any) => {
      return {
        id: item.id,
        email: item.email,
        username: item.username,
        img: item.img,
        tag: item.tag,
        online: item.online,
        birthday: item.birthday,
      };
    });
    for (let i = 0; i < data.length; i++) {
      const arr = data[i].tag.map((item: number) => {
        return {
          id: item,
        };
      });
      const sql2 = {
        status: true,
        $or: arr,
      };
      let count = 0;
      const data2: Document[] = await queryAll(sql2, "tag");
      data[i].tagObj = data2;
      const list: any = [{ ids: parseInt(params.userId) }, {
        ids: parseInt(data[i].id),
      }];
      const sql3 = { $and: list };
      const res3: any = await queryOne(sql3, "user_relation");
      const sql4 = { id: res3._id };
      const res4: any = await queryOne(sql4, "user_message");
      if (res4) {
        for (let j = 0; j < res4.info.length; j++) {
          if (
            res4.info[j].id == parseInt(data[i].id) &&
            res4.info[j].status == true
          ) {
            count++;
          }
        }
      }
      data[i].msgCount = count;
    }
    ctx.response.body = {
      "code": 200,
      "rows": data,
      "total": data.length,
      "msg": "查询成功",
    };
  }).get("/deleteMyFriend", verifyToken, async (ctx): Promise<void> => { // 删除好友
    const params: any = helpers.getQuery(ctx);
    const list: any = [{ ids: parseInt(params.userId) }, {
      ids: parseInt(params.friendId),
    }];
    const sql = { $and: list };
    const res: any = await queryOne(sql, "user_relation");
    if (res) {
      await deleteData({ _id: new ObjectId(res._id) }, "user_relation");
      await deleteData({ id: new ObjectId(res._id) }, "user_message");
    }
    ctx.response.body = {
      "code": 200,
      "msg": "删除成功",
    };
  }).get("/getInfoMsg", verifyToken, async (ctx): Promise<void> => { // 获取用户聊天记录
    const params: any = helpers.getQuery(ctx);
    const list: any = [{ ids: parseInt(params.id) }, {
      ids: parseInt(params.friendId),
    }];
    const sql = { $and: list };
    const res: any = await queryOne(sql, "user_relation");
    const sql2 = { id: res._id };
    const res2: any = await queryOne(sql2, "user_message");
    ctx.response.body = {
      "code": 200,
      "rows": res2,
      "msg": "查询成功",
    };
  }).get("/getMyFriendInfo", verifyToken, async (ctx): Promise<void> => { // 获取我的好友信息
    const params: any = helpers.getQuery(ctx);
    const sql = { id: parseInt(params.id) };
    const res: any = await queryOne(sql, "user");
    const data = {
      username: res.username,
      img: res.img,
    };
    ctx.response.body = {
      "code": 200,
      "rows": data,
      "msg": "查询成功",
    };
  }).post(
    "/editMessage",
    verifyToken,
    async (ctx): Promise<void> => { // 修改消息已读未读状态
      const params: any = await ctx.request.body({
        type: "json",
      }).value;
      const list: any = [{ ids: parseInt(params.id) }, {
        ids: parseInt(params.friendId),
      }];
      const sql = { $and: list };
      const res: any = await queryOne(sql, "user_relation");
      const res2: any = await queryOne({ id: res._id }, "user_message");
      for (let i = 0; i < res2.info.length; i++) {
        if (
          res2.info[i].id == parseInt(params.friendId) &&
          res2.info[i].status == true
        ) {
          res2.info[i].status = false;
        }
      }
      const param1 = { _id: new ObjectId(res2._id) };
      const param2 = {
        info: res2.info,
      };
      await update(param1, param2, "user_message");
      ctx.response.body = {
        "code": 200,
        "msg": "修改成功",
      };
    },
  ).get("/getRandomFriend", verifyToken, async (ctx): Promise<void> => { // 随机获取一个好友
    const params: any = helpers.getQuery(ctx);
    const res: any = await queryAll({}, "user");
    let sql: any = { ids: parseInt(params.id) };
    let sql2: any = { requestor: parseInt(params.id) };
    const res2: Document[] = await queryAll(sql, "user_relation");
    const res3: Document[] = await queryAll(sql2, "user_accept");
    let list: any = [];
    for (let i = 0; i < res2.length; i++) {
      list = [...list, ...res2[i].ids];
    }
    const list2 = list.filter((item: any) => item != parseInt(params.id));
    list2.push(parseInt(params.id));
    let data = res.filter((item: any) =>
      list2.findIndex((item2: any) => item2 == item.id) == -1
    );
    const list3: any = res3.map((item: any) => item.recipient);
    data = data.filter((item: any) =>
      list3.findIndex((item2: number) => item2 == item.id) == -1
    );
    const count = data.length;
    let data2: any = [];
    if (count > 0) {
      const ind = Math.round(Math.random() * (count - 1));
      const arr = data[ind].tag.map((item: number) => {
        return {
          id: item,
        };
      });
      const sql2 = {
        status: true,
        $or: arr,
      };
      const data3: Document[] = await queryAll(sql2, "tag");
      data2 = [{
        id: data[ind].id,
        email: data[ind].email,
        username: data[ind].username,
        img: data[ind].img,
        tag: data[ind].tag,
        tagObj: data3,
        birthday: data[ind].birthday,
      }];
    }
    ctx.response.body = {
      "code": 200,
      "rows": data2,
      "msg": "查询成功",
    };
  }).get("/getInterestFriend", verifyToken, async (ctx): Promise<void> => { // 按兴趣获取好友
    const params: any = helpers.getQuery(ctx);
    const list0: any = [{ tag: parseInt(params.tagId) }];
    const sql0 = { $or: list0 };
    const res: any = await queryAll(sql0, "user");
    let sql: any = { ids: parseInt(params.id) };
    let sql2: any = { requestor: parseInt(params.id) };
    const res2: Document[] = await queryAll(sql, "user_relation");
    const res3: Document[] = await queryAll(sql2, "user_accept");
    let list: any = [];
    for (let i = 0; i < res2.length; i++) {
      list = [...list, ...res2[i].ids];
    }
    const list2 = list.filter((item: any) => item != parseInt(params.id));
    list2.push(parseInt(params.id));
    let data = res.filter((item: any) =>
      list2.findIndex((item2: any) => item2 == item.id) == -1
    );
    const list3: any = res3.map((item: any) => item.recipient);
    for (let i = 0; i < data.length; i++) {
      if (list3.findIndex((item2: number) => item2 == data[i].id) != -1) {
        data[i].status = 2;
      } else {
        data[i].status = 0;
      }
    }
    let data2: any = [];
    for (let i = 0; i < data.length; i++) {
      const arr = data[i].tag.map((item: number) => {
        return {
          id: item,
        };
      });
      const sql2 = {
        status: true,
        $or: arr,
      };
      const data3: Document[] = await queryAll(sql2, "tag");
      data2.push({
        id: data[i].id,
        email: data[i].email,
        username: data[i].username,
        img: data[i].img,
        tag: data[i].tag,
        tagObj: data3,
        birthday: data[i].birthday,
        status: data[i].status,
      });
    }
    ctx.response.body = {
      "code": 200,
      "rows": data2,
      "msg": "查询成功",
    };
  }).get("/getAccurateFriend", verifyToken, async (ctx): Promise<void> => { // 按账号搜索用户
    const params: any = helpers.getQuery(ctx);
    const sql = { email: params.email };
    const res: any = await queryOne(sql, "user");
    if (res) {
      if (res.id == parseInt(params.id)) {
        ctx.response.body = {
          "code": 500,
          "msg": "那是你自己！",
        };
      } else {
        let status = 0;
        let list: any = [];
        const data1 = await queryAll(
          { ids: parseInt(params.id) },
          "user_relation",
        );
        for (let i = 0; i < data1.length; i++) {
          list = [...list, ...data1[i].ids];
        }
        const list2 = list.filter((item: any) => item != parseInt(params.id));

        let list3: any = [];
        const data2 = await queryAll(
          { requestor: parseInt(params.id) },
          "user_accept",
        );
        for (let i = 0; i < data2.length; i++) {
          list3 = [...list3, data2[i].recipient];
        }
        if (list3.findIndex((item: any) => item == res.id) != -1) {
          status = 2;
        } else if (list2.findIndex((item: any) => item == res.id) != -1) {
          status = 1;
        }
        const arr = res.tag.map((item: number) => {
          return {
            id: item,
          };
        });
        const sql3 = {
          status: true,
          $or: arr,
        };
        const data3: Document[] = await queryAll(sql3, "tag");
        const data4: any = [{
          id: res.id,
          email: res.email,
          username: res.username,
          img: res.img,
          tag: res.tag,
          tagObj: data3,
          status: status,
        }];
        ctx.response.body = {
          "code": 200,
          "rows": data4,
          "msg": "查询成功",
        };
      }
    } else {
      ctx.response.body = {
        "code": 500,
        "msg": "无该账号用户",
      };
    }
  }).get("/getMyAskRequestList", verifyToken, async (ctx): Promise<void> => { // 我的申请以及回复表
    const params: any = helpers.getQuery(ctx);
    const data: any = await queryAll(
      {
        $or: [{ requestor: parseInt(params.id) }, {
          recipient: parseInt(params.id),
        }],
      },
      "user_accept",
    );
    const data1: any = [];
    const data2: any = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i].recipient == params.id) {
        const res: any = await queryOne({ id: data[i].requestor }, "user");
        const list = res.tag.map((item: number) => {
          return {
            id: item,
          };
        });
        const sql2 = {
          status: true,
          $or: list,
        };
        const list2: Document[] = await queryAll(sql2, "tag");
        data1.push({
          id: res.id,
          email: res.email,
          username: res.username,
          img: res.img,
          tag: res.tag,
          tagObj: list2,
          testInfo: data[i].askInfo,
          birthday: res.birthday,
        });
      } else if (data[i].requestor == params.id) {
        const res: any = await queryOne({ id: data[i].recipient }, "user");
        const list = res.tag.map((item: number) => {
          return {
            id: item,
          };
        });
        const sql2 = {
          status: true,
          $or: list,
        };
        const list2: Document[] = await queryAll(sql2, "tag");
        data2.push({
          id: res.id,
          email: res.email,
          username: res.username,
          img: res.img,
          tag: res.tag,
          tagObj: list2,
          testInfo: data[i].askInfo,
          birthday: res.birthday,
        });
      }
    }
    ctx.response.body = {
      "code": 200,
      "data1": data1,
      "data2": data2,
      "msg": "查询成功",
    };
  });
}
