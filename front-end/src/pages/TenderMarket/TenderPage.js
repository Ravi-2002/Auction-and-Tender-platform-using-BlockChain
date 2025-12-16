import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.css";
import { Table, Button, Form } from "react-bootstrap";
import { ethers, utils } from "ethers";
import axios from "axios";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";
import { updateAccountData } from "../../features/blockchain";
import { CircularProgress } from "@material-ui/core";
import { useParams } from "react-router-dom";
import { File } from "web3.storage";
import { ipfsSaveContent } from "./../../utils/ipfsStorage";

import { IPFS_GATEWAY } from "../../utils/ipfsStorage";
import TenderContract from "../../artifacts/contracts/TenderMarket.json";
import contractsAddress from "../../artifacts/deployments/map.json";

const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
const tenderContractAddress = contractsAddress["5777"]["TenderMarket"][0];

const tenderStatusMap = { 0: "OPEN", 1: "ENDED" };

function TenderPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const data = useSelector((state) => state.blockchain.value);

  const [userBid, setUserBid] = useState(0);
  const [tenderState, setTenderState] = useState({
    seller: "",
    name: "",
    description: "",
    image: "",
    startPrice: 0,
    highest_bid_in_USD: 0,
    highest_bid_in_ETH: 0,
    highestBidder: "",
    endTime: 0,
    status: "",
  });
  const [DocumentState, setDocumentState] = useState({
    document: "",
  });

  

  const [loading, setLoading] = useState(false);
  const [bidAmount, setBidAmount] = useState(0);
  const [isBidder, setIsBidder] = useState(false);
  const [document, setDocument] = useState({
    name: "",
    file: null,
  });
  const updateBalance = async () => {
    const signer = provider.getSigner();
    const balance = await signer.getBalance();
    dispatch(
      updateAccountData({ ...data, balance: utils.formatUnits(balance) })
    );
  };
  const getDocument = async (f) => {
    f.preventDefault();
    const file = f.target.files[0];
    setDocument({
      name: file.name,
      file: file,
    });
  };
  const tenderDetails = async (tenderId) => {
    if (id !== undefined) {
      const market = new ethers.Contract(
        tenderContractAddress,
        TenderContract.abi,
        provider
      );
      const tenders = await market.getTendersList();
      const details = tenders[tenderId];
      const _userBid = await market.getUserBidAmount(data.account, tenderId);
      setUserBid(utils.formatUnits(_userBid));
      const docu= await market.getDocumentList();
      
      const _isBidder = Number(utils.formatUnits(_userBid)) !== 0;
      setIsBidder(_isBidder);

      const metadataUrl = details[2].replace("ipfs://", IPFS_GATEWAY);
      const betadataUrl = docu[1].replace("ipfs://", IPFS_GATEWAY);
      let metaData = await axios.get(metadataUrl);
      let betaData = await axios.get(betadataUrl);
      const imgUrl = metaData.data.image.replace("ipfs://", IPFS_GATEWAY);
      const docUrl = betaData.data.document.replace("ipfs://",IPFS_GATEWAY);
      setDocumentState({
        document:docUrl,
      });
      convertPrice(utils.formatUnits(details[5])).then((res) => {
        setTenderState({
          ...tenderState,
          seller: details[1],
          name: metaData.data.name,
          description: metaData.data.description,
          image: imgUrl,
          startPrice: utils.formatUnits(details[3]),
          highest_bid_in_ETH: utils.formatUnits(details[4]),
          highest_bid_in_USD: utils.formatUnits(details[4]),
          highestBidder: details[5],
          endTime: Number(details[6]),
          status: tenderStatusMap[details[7]],
        });
      });

    }
  };

  const bid = async (tenderId) => {
    if(tenderId !== undefined){ 
    try {
      setLoading(true);
        const bid_in_eth = Number(bidAmount);
        const signer = provider.getSigner();
        const market = new ethers.Contract(
          tenderContractAddress,
          TenderContract.abi,
          signer
        );
        const bid_fx = await market.bid(tenderId,{
          value: utils.parseEther(bid_in_eth.toString(), "ether"),
          
        });
        await bid_fx.wait();
        
        setLoading(false);
        tenderDetails(tenderId);
        updateBalance();

      }catch (err) {
        window.alert("An error has occured, Please try again");
        setLoading(false);
      }
      
    }
    
    
     
  };
  const upload = async () => {
    if(document!== undefined){ 
    try {
      setLoading(true);
      const tenderContract = new ethers.Contract(
        tenderContractAddress,
        TenderContract.abi,
        signer
      );  
      const cid = await ipfsSaveContent(document.file);
        const imageURI = `ipfs://${cid}/${document.name}`;

        // const { name, description } = formInput;
        // if (!name || !description || !imageURI) return;
        const data = JSON.stringify({
          document: imageURI,
        });

        const blob = new Blob([data], {
          type: "application1/json",
        });

        const file = new File([blob], "quality.json");

        const dataCid = await ipfsSaveContent(file);
        const descriptionURI = `ipfs://${dataCid}/quality.json`;
        const add_tx = await tenderContract.verification(
          descriptionURI,
        );
        await add_tx.wait();
        
        setLoading(false);
        setDocument({ name: "", file: null });
      }catch (err) {
        window.alert("An error has occured, Please try again");
        setLoading(false);
      }
      
    }
    
    
     
  };

  const withdraw = async (id) => {
    try {
      if (id !== undefined) {
        setLoading(true);
        const signer = provider.getSigner();
        const market = new ethers.Contract(
          tenderContractAddress,
          TenderContract.abi,
          signer
        );
        const withdraw_tx = await market.withdrawBid(id);
        await withdraw_tx.wait();

        setLoading(false);
        tenderDetails(id);
        updateBalance();
      }
    } catch (err) {
      window.alert("An error has occured, Please try again");
      setLoading(false);
    }
  };

  const endTender = async (id) => {
    try {
      if (id !== undefined) {
        setLoading(true);
        const signer = provider.getSigner();
        const market = new ethers.Contract(
          tenderContractAddress,
          TenderContract.abi,
          signer
        );
        const end_tx = await market.endTender(id);
        await end_tx.wait();

        setLoading(false);
        tenderDetails(id);
        updateBalance();
      }
    } catch (err) {
      window.alert("An error has occured, Please try again");
      setLoading(false);
    }
  };

  async function convertPrice(amount) {
    const market = new ethers.Contract(
      tenderContractAddress,
      TenderContract.abi,
      provider
    );
    const price_in_eth = await market.callStatic._convertUSDToETH(
      utils.parseEther(amount, "ether")
    );
    return price_in_eth;
  }

  useEffect(() => {
    tenderDetails(Number(id));
  }, [data.account, data.network, isBidder]);

  return (
    <>
      <div className="row p-2">
        <div className="col-md-7 text-center p-3">
          <div className="p-3">
            {tenderState.status === "OPEN" ? (
              <div>
                Sale of <b>{tenderState.name}</b> for{" "}
                <b>
                  {parseFloat(tenderState.highest_bid_in_ETH).toFixed(4)} ETH
                </b>
              </div>
            ) : (
              <div>
                <b>{tenderState.name}</b> bought for{" "}
                <b>
                  {parseFloat(tenderState.highest_bid_in_ETH).toFixed(4)} ETH
                </b>
              </div>
            )}

            <div>{tenderState.description}</div>
            <br />
            <img
              className="rounded"
              src={tenderState.image}
              height="350px"
              width="560px"
            />
            <br />
            <br />
            {data.account === tenderState.seller ? (
              tenderState.status === "OPEN" ? (
                moment.unix(tenderState.endTime).isBefore(Date.now()) ? (
                  <Button
                    variant="primary"
                    onClick={() => {
                      endTender(id);
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={26} color="#fff" />
                    ) : (
                      "Close"
                    )}
                  </Button>
                ) : (
                  <p>Your tender is open</p>
                )
              ) : (
                <p>This tender is completed</p>
              )
            ) : isBidder ? (
              data.account === tenderState.highestBidder ? (
                tenderState.status === "OPEN" ? (
                  <p>You are the highest bidder</p>
                ) : (
                  <p>You won this tender</p>
                )
              ) : tenderState.status === "OPEN" ? (
                <>
                  <div className="col-md-4" style={{ marginLeft: "35%" }}>
                    <Form.Control
                      type="number"
                      placeholder="Add to your previous Bid"
                      onChange={(e) => {
                        setBidAmount(e.target.value);
                      }}
                    />
                    <br />
                    <Button
                      variant="primary"
                      onClick={() => {
                        bid(id);
                        upload();
                      }}
                      
                    >
                      {loading ? (
                        <CircularProgress size={26} color="#fff" />
                      ) : (
                        "OutBid"
                      )}
                    </Button>
                    <Button
                      style={{ marginLeft: "5px" }}
                      variant="danger"
                      onClick={() => {
                        withdraw(id);
                      }}
                    >
                      {loading ? (
                        <CircularProgress size={26} color="#fff" />
                      ) : (
                        "Withdraw"
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <p>This tender is completed</p>
              )
            ) : tenderState.status === "OPEN" ? (
              <>
                <div className="col-md-3" style={{ marginLeft: "35%" }}>
                  <Form.Control
                    type="number"
                    placeholder="Enter bid amount"
                    onChange={(e) => {
                      setBidAmount(e.target.value);
                    }}
                  />
                  <br />
                  <Form.Label>Upload the document</Form.Label>
                  <Form.Control 
                  type="file" 
                  name="document"
                  onChange={(f) => {
                    getDocument(f);
                  }}
                  />
                  {document.file && (
                  <div>
                    <iframe
                      src={URL.createObjectURL(document.file)}
                    />
                  </div>
                  
                )}
                <br />
                  <Button
                    variant="primary"
                    onClick={() => {
                      bid(id);
                      upload();
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={26} color="#fff" />
                    ) : (
                      "Bid"
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <p>This tender is completed</p>
            )}
          </div>
        </div>
        <div className="col-md-5 p-3">
          <h3 className="text-center p-2">Tender Details</h3>
          <Table responsive>
            <tbody>
              <tr>
                <td className="p-2">Seller</td>
                <td>
                  {data.account === tenderState.seller
                    ? "you are the seller"
                    : tenderState.seller}
                </td>
              </tr>

              <tr>
                <td className="p-2">Tender Status</td>
                <td>{tenderState.status}</td>
              </tr>

              <tr>
                <td className="p-2">Tender End Date</td>
                <td>
                  {moment
                    .unix(tenderState.endTime)
                    .format("MMM D, YYYY, HH:mmA")}
                </td>
              </tr>

              <tr>
                <td className="p-2">Start Price in USD</td>
                <td>{tenderState.startPrice} $</td>
              </tr>

              <tr>
                <td className="p-2">Lowest Bid</td>
                <td>
                  {parseFloat(tenderState.highest_bid_in_ETH).toFixed(5)} ETH
                </td>
              </tr>
              <tr>
                <td className="p-2">Lowest Bidder</td>
                <td>
                  {data.account === tenderState.highestBidder
                    ? "You are the highest Bidder"
                    : tenderState.highestBidder ===
                      ethers.constants.AddressZero
                    ? "No Bidder yet"
                    : tenderState.highestBidder}
                </td>
              </tr>
              <tr>
                  <td className="p-2">Quality Assurance Document</td>
                  <td>
                    <a>{DocumentState.document}</a>
                  </td>
                </tr>
              {data.account !== tenderState.seller ? (
                <tr>
                  <td className="p-2">Your Bid</td>
                  <td>
                    {Number(userBid) === 0
                      ? "You didn't bid on this tender"
                      : parseFloat(userBid).toFixed(5) + " ETH"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </div>
      </div>
    </>
  );
}

export default TenderPage;
