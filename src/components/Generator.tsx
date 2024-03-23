"use client";
import React, { useEffect, useState } from "react";
import { Button, Form, Input, Image, Spin, message } from "antd";
import axios from "axios";
import { NFTStorage, File } from "nft.storage";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
  useReadContract,
} from "wagmi";
import aiNftAbi from "@/constants/ai-nft-abi.json";

const layout = {
  labelCol: { span: 4 },
};

export default function Generator() {
  const [disabled, setDisabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [image, setImage] = useState("");
  const [statusTips, setStatusTips] = useState("");
  const account = useAccount();
  const { data: balanceInfo } = useBalance({
    address: account.address,
    query: {
      enabled: !!account.address,
    },
  });
  const {
    data: hash,
    writeContract: mint,
    isError: isMintError,
  } = useWriteContract();

  const {
    isSuccess: txSuccess,
    isFetching,
    error: txError,
  } = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: !!hash,
    },
  });

  const { data: cost } = useReadContract({
    abi: aiNftAbi,
    address: "0x59f0e69b66baf0073d8a6145517b84ca98e329c2",
    functionName: "getCost",
  });
  useEffect(() => {
    if (isMintError || txError) {
      setStatusTips("铸造失败！！！");
      setLoading(false);
    } else if (isFetching) {
      setStatusTips("铸造中...");
    } else if (txSuccess) {
      setStatusTips("铸造成功！！！");
      setLoading(false);
    }
  }, [isMintError, txError, txSuccess, isFetching]);
  useEffect(() => {
    if (name && desc) {
      setDisabled(false);
    } else {
      setDisabled(true);
    }
  }, [name, desc]);
  const createImg = async () => {
    setStatusTips("创建图片中...");
    const URL = `https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2`;
    const res = await axios({
      url: URL,
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_HUGGING_FACE_API_KEY}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        inputs: desc,
        options: { wait_for_model: true },
      }),
      responseType: "arraybuffer",
    });
    const type = res.headers["content-type"];
    const data = res.data;

    const base64data = Buffer.from(data).toString("base64");
    const img = `data:${type};base64,` + base64data;
    setImage(img);
    return img;
  };
  const uploadImage = async (imgRaw: any) => {
    setStatusTips("上传图片中...");
    const nftstorage = new NFTStorage({
      token: process.env.NEXT_PUBLIC_NFT_STORAGE_API_KEY as string,
    });

    const { ipnft } = await nftstorage.store({
      image: new File([imgRaw], "image.jpeg", { type: "image/jpeg" }),
      name: name,
      description: desc,
    });
    const url = `https://ipfs.io/ipfs/${ipnft}/metadata.json`;
    return url;
  };
  const mintImage = async (url: string) => {
    setStatusTips("钱包签名中...");
    mint({
      abi: aiNftAbi,
      address: "0x59f0e69b66baf0073d8a6145517b84ca98e329c2",
      functionName: "mintNft",
      args: [url],
      value: cost as bigint,
    });
  };
  const submit = async () => {
    if (!account.isConnected) {
      message.warning("请先链接钱包");
      return;
    }
    if (balanceInfo && cost && balanceInfo?.value < (cost as bigint)) {
      message.warning("账户余额不足");
      return;
    }
    setLoading(true);
    const imgRaw = await createImg();
    const url = await uploadImage(imgRaw);
    await mintImage(url);
  };
  return (
    <div className="mt-[50px]">
      <div className="h-[80px] w-[500px] mx-auto text-center text-[26px] font-[800] text-[#333]">
        {statusTips}
      </div>
      <div className="flex justify-center items-center">
        <Form {...layout} size="large" className="w-[300px]">
          <Form.Item label="">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入名称"
            />
          </Form.Item>
          <Form.Item label="">
            <Input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="请输入描述"
            />
          </Form.Item>
          <Button
            loading={loading}
            onClick={submit}
            disabled={disabled}
            type="primary"
            htmlType="submit"
            className="w-full"
          >
            Submit
          </Button>
        </Form>
        <div className="flex overflow-hidden justify-center items-center ml-[50px] w-[400px] h-[400px] border-[#0E76FD] rounded-[10px] border-dashed border-[4px] ">
          {loading ? (
            <Spin size={"large"} />
          ) : (
            image &&
            txSuccess && (
              <Image
                alt=""
                width={"400px"}
                height={"400px"}
                preview={false}
                src={image}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
