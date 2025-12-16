import "bootstrap/dist/css/bootstrap.css";
import React, { useEffect, useState } from "react";
import { ethers, utils } from "ethers";
import axios from "axios";
import { makeStyles, CircularProgress } from "@material-ui/core";
import { useSelector } from "react-redux";
import {
  Card,
  Container,
  Row,
  Col,
  Form,
  FormControl,
  Button,
} from "react-bootstrap";

import { IPFS_GATEWAY } from "../../utils/ipfsStorage";
import TenderContract from "../../artifacts/contracts/TenderMarket.json";
import contractsAddress from "../../artifacts/deployments/map.json";
import networks from "../../utils/networksMap.json";

const tenderContractAddress = contractsAddress["5777"]["TenderMarket"][0];
const provider = new ethers.providers.Web3Provider(window.ethereum, "any");

const tenderStatusMap = { OPEN: 0, ENDED: 1 };

const useStyles = makeStyles((theme) => ({
  Container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing(2),
  },
}));

function TenderMarketPage() {
  const classes = useStyles();

  const data = useSelector((state) => state.blockchain.value);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [tenders, setTenders] = useState([]);

  async function loadTenders() {
    const signer = provider.getSigner();
    const market = new ethers.Contract(
      tenderContractAddress,
      TenderContract.abi,
      signer
    );
    const allTenders = await market.getTendersList();

    const openTenders = allTenders.filter(
      (p) => p[7] === tenderStatusMap["OPEN"]
    );
    if (openTenders !== undefined) {
      const items = await Promise.all(
        openTenders.map(async (tender) => {
          const metadataUrl = tender[2].replace("ipfs://", IPFS_GATEWAY);
          let metaData = await axios.get(metadataUrl);
          const imgUrl = metaData.data.image.replace("ipfs://", IPFS_GATEWAY);

          let item = {
            tenderId: Number(tender[0]),
            name: metaData.data.name,
            image: imgUrl,
            price: utils.formatUnits(tender[4].toString(), "ether"),
          };
          return item;
        })
      );
      setTenders(items.reverse());
    }
  }

  function findTender() {
    if (search !== "") {
      setLoading(true);
      const foundTenders = tenders.filter((p) =>
        p.name.toLowerCase().includes(search)
      );
      setTenders(foundTenders);
      setLoading(false);
    }
  }

  // ganache network is used for testing purposes
  const currentNetwork = networks["1337"];
  const isGoodNet = data.network === currentNetwork;
  const isConnected = data.account !== "";

  useEffect(() => {
    loadTenders();
  }, [search]);

  return (
    <>
      <div className={classes.Container}>
        {isConnected ? (
          isGoodNet ? (
            <>
              <Form className="d-flex">
                <FormControl
                  type="search"
                  placeholder="Search for a product"
                  className="me-2"
                  aria-label="Search"
                  onChange={(e) => {
                    setSearch(e.target.value);
                  }}
                />
                <Button
                  variant="outline-info"
                  onClick={() => {
                    findTender();
                  }}
                >
                  {loading ? (
                    <CircularProgress size={26} color="#fff" />
                  ) : (
                    "Search"
                  )}
                </Button>
              </Form>
              <Container>
                <Row className="mt-5">
                  {tenders.map((tender, id) => {
                    return (
                      <Col style={{ marginBottom: "40px" }} md={3} key={id}>
                        <Card style={{ width: "16rem" }} key={id}>
                          <Card.Img
                            variant="top"
                            src={tender.image}
                            width="0px"
                            height="180px"
                          />
                          <Card.Body>
                            <Card.Title style={{ fontSize: "14px" }}>
                              {tender.name}
                            </Card.Title>
                            <Card.Text>
                              <Card.Text>
                                {parseFloat(tender.price).toFixed(3)} ETH
                              </Card.Text>
                            </Card.Text>
                            <a
                              className="btn btn-primary"
                              href={"/tenders/" + tender.tenderId}
                              role="button"
                            >
                              See More
                            </a>
                          </Card.Body>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              </Container>
            </>
          ) : (
            <div className={classes.Container}>
              You are on the wrong network switch to {currentNetwork} network
            </div>
          )
        ) : null}
      </div>
    </>
  );
}

export default TenderMarketPage;
