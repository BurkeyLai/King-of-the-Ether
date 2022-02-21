// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

contract KingOfEther {

    // 出價最高的金額
    uint public max_amount;
    string public owner_name = "imugly1029";

    // 活動開始與結束時間
    uint public startAt;
    uint public endAt;

    // 管理者
    address owner;
    // 現任國王
    address currentKing;

    // 狀態
    State private state;
    enum State { Started, Ended }

    address[] kingIndexs;
    mapping (address => King) public kings;

    // 通知有新任國王上任
    event NoticeNewKing(address addr, uint amount, string name);
    event NoticePlayerWithdrawal(address addr, string name, uint amount);
    event NoticeOwnerWithdrawal(address addr, string name, uint amount);

    struct King {
        address addr;
        uint amount;
        string name;
        uint createdAt;
        uint withdrawalAmount;
    }

    modifier onlyOwner() { require(msg.sender == owner, "You are not owner!"); _; }
    modifier onlyTimeout() { require(block.timestamp > endAt, "Game still running!"); _; }
    modifier overMinimumPrice() { require(msg.value != 0 && msg.value >= 0.1 ether, "Not enough money!"); _; }
    modifier candidate(uint sendAmount) { require(available(sendAmount), "You are not available!"); _; }
    modifier replacedKing() { require(kings[msg.sender].withdrawalAmount != 0, "Only the replaced king can withdrawal money!"); _; }

    constructor(uint afterFewDay) {
        owner = msg.sender;
        state = State.Started;
        startAt = block.timestamp;
        endAt = block.timestamp + afterFewDay * 1 days;
    }

    function available(uint sendAmount) private view returns (bool) {
        if(state == State.Ended) return false;
        if(block.timestamp > endAt) return false;
        if(kingIndexs.length == 0) return true;
        if(currentKing == msg.sender) return false;
        if(sendAmount >= kings[currentKing].amount + 0.1 ether) return true;
        return false;
    }

    // 篡位
    function replaceKing(string memory _name) payable overMinimumPrice candidate(msg.value) public {
        if(kingIndexs.length > 0) {
            kings[currentKing].withdrawalAmount += msg.value - 0.05 ether;
        }
        max_amount = msg.value;
        kingIndexs.push(msg.sender);
        kings[msg.sender] = King(msg.sender, msg.value, _name, block.timestamp, 0);
        currentKing = msg.sender;
        emit NoticeNewKing(msg.sender, msg.value, _name);
    }

    function kingInfo() public view returns (King memory) {
        return kings[currentKing];
    }

    // 提領管理費
    function ownerWithdrawal() payable onlyOwner onlyTimeout public {
        uint balance = address(this).balance;
        payable(owner).transfer(balance);
        
        //owner.transfer(address(this).balance);
        state = State.Ended;

        emit NoticeOwnerWithdrawal(owner, owner_name, balance);
    }

    // 被篡位的人，可以拿走篡位的人的錢，但要先扣除管理費。
    function playerWithdrawal() payable replacedKing public {
        require(kings[msg.sender].withdrawalAmount > 0);
        uint payment = kings[msg.sender].withdrawalAmount;
        kings[msg.sender].withdrawalAmount = 0;
        payable(msg.sender).transfer(payment);

        emit NoticePlayerWithdrawal(msg.sender, kings[msg.sender].name, payment);
    }

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

    function terminator() onlyOwner public {
        endAt = block.timestamp;
        state = State.Ended;
    }
}
