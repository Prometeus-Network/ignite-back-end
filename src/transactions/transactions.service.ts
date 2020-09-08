import { Injectable } from "@nestjs/common";
import { TransactionsRepository } from "./TransactionsRepository";
import { Transaction } from "./entities/Transaction";
import { TokenExchangeService } from "../token-exchange";
import { config } from "../config";
import { TransactionStatus } from "./types/TransactionStatus.enum";
import { User } from "../users/entities";
import { TransactionResponse } from "./types/responses/TransactionResponse";
import { GetTransactionsFilters } from "./types/requests/GetTransactionsFilters";
import { TransactionMapper } from "./TransactionMapper";
import { LoggerService } from "nest-logger";

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly tokenExchangeService: TokenExchangeService,
    private readonly transactionsMapper: TransactionMapper,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Don't use `Promise.all` instead of `for`, and do not parallel invocations of performTransaction(),
   * because the ignite-token-exchange service expects the exchanges to be sequenced
   * because of some implementation details of Binance.
   */
  public async performTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    const completeTransactions: Transaction[] = []

    for (const transaction of transactions) {
      await this.performTransaction(transaction)
        .then(resultingTransaction => {
          completeTransactions.push(resultingTransaction)
          this.logger.info(`performTransactions: transaction complete: ${JSON.stringify(resultingTransaction)}`)
        })
        .catch(err => {
          this.logger.error(`performTransactions: error occurred: ${JSON.stringify(err)} for transaction ${JSON.stringify(transaction)}`)
        })
    }

    return completeTransactions
  }

  public async performTransaction(transaction: Transaction): Promise<Transaction> {
    const transactionHash = await this.tokenExchangeService.sendTokens({
      addressTo: transaction.txnTo,
      amount: +transaction.txnSum,
      privateKeyFrom: config.MEMEZATOR_PRIZE_FUND_ACCOUNT_PRIVATE_KEY,
    })

    transaction.txnHash = transactionHash
    transaction.txnDate = new Date()
    transaction.txnStatus = TransactionStatus.PERFORMED

    await this.transactionsRepository.save(transaction)

    return transaction
  }

  public async getTransactions(user: User, filters: GetTransactionsFilters): Promise<TransactionResponse[]> {
    const transactions = await this.transactionsRepository.findByUser(user, filters)
    return this.transactionsMapper.toTransactionResponses(transactions)
  }
}
