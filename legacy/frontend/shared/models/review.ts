import ReviewAuthor from './review-author';

export default interface Review {
  id: string;
  content: string;
  authorUser: ReviewAuthor;
}
