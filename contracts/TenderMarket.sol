// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IFactory.sol";

contract TenderMarket {
    //--------------------------------------------------------------------
    // VARIABLES

    address payable public factory;
    uint256 public fee = 5;

    Tender[] public tendersList;

    struct Tender {
        uint256 id;
        address payable seller;
        string itemInformation;
        uint256 startPrice;
        uint256 highestBid;
        address highestBidder;
        uint256 endTimstamp;
        Status status;
    }
    Document[] public doc;
    struct Document {
        string info;
    }
   

    mapping(uint256 => mapping(address => uint256)) public tenderBidsMapping;

    enum Status {
        OPEN,
        ENDED
    }

    //--------------------------------------------------------------------
    // EVENTS

    event TenderStarted(uint256 id, address seller, uint256 timestamp);
    event TenderEnded(uint256 id, uint256 timestamp);

    //--------------------------------------------------------------------
    // MODIFIERS

    modifier onlyAdmin() {
        require(msg.sender == factory, "only admin can call this");
        _;
    }

    modifier onlySeller(uint256 _tenderId) {
        require(
            msg.sender == tendersList[_tenderId].seller,
            "only buyer can call this"
        );
        _;
    }

    //--------------------------------------------------------------------
    // CONSTRUCTOR

    constructor(address _factory) {
        factory = payable(_factory);
    }

    //--------------------------------------------------------------------
    // FUNCTIONS

    function startTender(
        string memory _itemInfo,
        uint256 _initialPrice,
        uint256 _duration
    ) public {
        uint256 _id = tendersList.length;
        uint256 start = block.timestamp;
        uint256 end = start + _duration;
        uint256 highestBidETH = _convertUSDToETH(_initialPrice);

        tendersList.push(
            Tender(
                _id,
                payable(msg.sender),
                _itemInfo,
                _initialPrice,
                highestBidETH,
                address(0),
                end,
                Status.OPEN
            )
        );

        emit TenderStarted(_id, msg.sender, start);
    }
    function verification(
        string memory information
    )public {
        doc.push(
            Document(
                information
            )
        );
    }
    
    function bid(uint256 _tenderId) public payable {
        Tender memory tender = tendersList[_tenderId];
        
        
        require(block.timestamp < tender.endTimstamp, "Tender Ended");

        bool isInTenderBidders = _isBidder(msg.sender, _tenderId);
        if (isInTenderBidders) {
            require(
                tenderBidsMapping[_tenderId][msg.sender] + msg.value >
                    tender.highestBid,
                "insuffisant amount"
            );
            tenderBidsMapping[_tenderId][msg.sender] += msg.value;
        } else {
            require(msg.value > tender.highestBid, "insuffisant amount");
            tenderBidsMapping[_tenderId][msg.sender] = msg.value;
        }

        tender.highestBid = tenderBidsMapping[_tenderId][msg.sender];
        tender.highestBidder = msg.sender;
        tendersList[_tenderId] = tender;
        
    }

    function withdrawBid(uint256 _tenderId) public {
        uint256 amount = tenderBidsMapping[_tenderId][msg.sender];

        require(amount > 0, "No Bid found on this tender");
        require(
            tendersList[_tenderId].highestBidder != msg.sender,
            "Highest Bidder can withdraw funds"
        );

        tenderBidsMapping[_tenderId][msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function endTender(uint256 _tenderId) public onlySeller(_tenderId) {
        Tender memory tender = tendersList[_tenderId];
        require(
            block.timestamp >= tender.endTimstamp,
            "Tender Period not reached yet"
        );

        tender.status = Status.ENDED;
        tendersList[_tenderId] = tender;
        tender.seller.transfer((tender.highestBid * (1000 - fee)) / 1000);
        factory.transfer((tender.highestBid * fee) / 1000);

        emit TenderEnded(_tenderId, block.timestamp);
    }

    function _isBidder(address _user, uint256 _tenderId)
        public
        view
        returns (bool)
    {
        if (tenderBidsMapping[_tenderId][_user] > 0) {
            return true;
        } else {
            return false;
        }
    }

    function getUserBidAmount(address _user, uint256 _tenderId)
        public
        view
        returns (uint256)
    {
        return tenderBidsMapping[_tenderId][_user];
    }

    function getTendersList() public view returns (Tender[] memory) {
        return tendersList;
    }
    function getDocumentList() public view returns (Document[] memory){
        return doc;
    }

    function _convertUSDToETH(uint256 amountInUSD) public returns (uint256) {
        return IFactory(factory).convertUSDToETH(amountInUSD);
    }

    //--------------------------------------------------------------------
    // ADMIN FUNCTIONS

    function changeFee(uint256 _newFee) public onlyAdmin {
        fee = _newFee;
    }
}
