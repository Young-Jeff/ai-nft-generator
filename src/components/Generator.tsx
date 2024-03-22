"use client";
import React, { useEffect, useState } from "react";
import { Button, Form, Input, Image, Spin, message, Steps } from "antd";
import axios from "axios";
import { NFTStorage, File } from "nft.storage";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import aiNftAbi from "@/constants/ai-nft-abi.json";

const layout = {
  labelCol: { span: 4 },
};

export default function Generator() {
  const setpsArr = [
    {
      title: "生成图片",
      status: "wait",
    },
    {
      title: "上传图片",
      status: "wait",
    },
    {
      title: "铸造完成",
      status: "wait",
    },
  ];
  const [disabled, setDisabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [image, setImage] = useState("");
  const [steps, setSteps] = useState<any[]>([...setpsArr]);
  const account = useAccount();
  const {
    data: hash,
    writeContract: mint,
    isError: isMintError,
    isPending: isMintLoading,
    error: mintError,
  } = useWriteContract();
  const { isSuccess: txSuccess, error: txError } = useWaitForTransactionReceipt(
    {
      hash,
      query: {
        enabled: !!hash,
      },
    },
  );
  useEffect(() => {
    console.log(mintError);
  }, [mintError]);
  useEffect(() => {
    if (isMintError || txError) {
      setSteps((s) => {
        const val = [...s];
        val.splice(2, 10, {
          title: "铸造失败",
          status: "error",
        });
        return val;
      });
    } else if (isMintLoading) {
      setSteps((s) => {
        const val = [...s];
        val.splice(2, 0, {
          title: "铸造中",
          status: "wait",
        });
        return val;
      });
    } else if (txSuccess) {
      setSteps((s) => {
        const val = [...s];
        val[2].status = "finish";
        val[3].status = "finish";
        return val;
      });
    }
  }, [isMintLoading, isMintError, txError, txSuccess]);
  useEffect(() => {
    if (name && desc) {
      setDisabled(false);
    } else {
      setDisabled(true);
    }
  }, [name, desc]);
  const createImg = async () => {
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
    steps[0].status = "finish";
    setSteps(steps);
    return img;
  };
  const uploadImage = async (imgRaw: any) => {
    const nftstorage = new NFTStorage({
      token: process.env.NEXT_PUBLIC_NFT_STORAGE_API_KEY as string,
    });

    const { ipnft } = await nftstorage.store({
      image: new File([imgRaw], "image.jpeg", { type: "image/jpeg" }),
      name: name,
      description: desc,
    });
    const url = `https://ipfs.io/ipfs/${ipnft}/metadata.json`;
    steps[1].status = "finish";
    setSteps(steps);
    return url;
  };
  const mintImage = async (url: string) => {
    await mint({
      abi: aiNftAbi,
      address: "0x59f0e69b66baf0073d8a6145517b84ca98e329c2",
      functionName: "mintNft",
      args: [url],
    });
  };
  const submit = async () => {
    setSteps(setpsArr);
    if (!account.isConnected) {
      message.warning("请先链接钱包");
      return;
    }
    setLoading(true);
    const imgRaw = await createImg();
    const url = await uploadImage(imgRaw);
    await mintImage(url);
    setLoading(false);
  };
  return (
    <div className="mt-[50px]">
      <div className="h-[80px] w-[500px] mx-auto">
        <Steps progressDot items={steps} />
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
            image && (
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
