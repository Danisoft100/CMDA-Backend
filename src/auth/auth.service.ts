import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/users.schema';
import { ISuccessResponse } from '../_global/interface/success-response';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
      return payload;
    } catch {
      throw new UnauthorizedException();
    }
  }

  async signUp(signUpDto: CreateUserDto): Promise<ISuccessResponse> {
    try {
      const {
        email,
        password,
        role,
        admissionYear, // student
        yearOfStudy, // student
        licenseNumber, // doctor || globalnetwork
        specialty, // doctor || globalnetwork
        ...createUserDto
      } = signUpDto;

      // check for role specific fields and throw error
      if (role === 'Student' && (!admissionYear || !yearOfStudy)) {
        throw new BadRequestException('admissionYear and yearOfStudy are compulsory for students');
      }
      if (['Doctor', 'GlobalNetwork'].includes(role) && (!licenseNumber || !specialty)) {
        throw new BadRequestException(
          'licenseNumber and specialty are compulsory for doctors / globalnetwork members',
        );
      }
      // hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      // create user based on role && ignore non-related fields
      const user = await this.userModel.create({
        ...createUserDto,
        email,
        password: hashedPassword,
        role,
        ...(role === 'Student' ? { admissionYear, yearOfStudy } : { licenseNumber, specialty }),
      });
      // accessToken using id and email
      const accessToken = this.jwtService.sign({ id: user._id, email, role: user.role });
      // return response
      return {
        success: true,
        message: 'Registration successful',
        data: { user, accessToken },
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<ISuccessResponse> {
    const { email, password } = loginDto;
    // check if user with email exists
    const user = await this.userModel.findOne({ email });
    if (!user) throw new UnauthorizedException('Invalid email or password');
    // check if password matches
    const isPasswordMatched = await bcrypt.compare(password, user.password);
    if (!isPasswordMatched) throw new UnauthorizedException('Invalid email or password');
    // generate access token
    const accessToken = this.jwtService.sign({ id: user._id, email, role: user.role });
    // return response
    return {
      success: true,
      message: 'Login successful',
      data: { user, accessToken },
    };
  }

  async getProfile(id: string): Promise<ISuccessResponse> {
    const user = await this.userModel.findById(id).populate('eventsRegistered', '_id, name');
    return {
      success: true,
      message: 'Profile fetched successfully',
      data: user,
    };
  }

  async updateProfile(id: string, updateProfileDto): Promise<ISuccessResponse> {
    const NON_EDITABLES = [
      '_id',
      'membershipId',
      'email',
      'eventsRegistered',
      'avatarUrl',
      'avatarCloudId',
    ];
    NON_EDITABLES.forEach((key) => {
      delete updateProfileDto[key];
    });
    const user = await this.userModel.findByIdAndUpdate(id, updateProfileDto, { new: true });
    return {
      success: true,
      message: 'Profile updated successfully',
      data: user,
    };
  }

  async resendVerifyCode(resendCodeDto): Promise<ISuccessResponse> {
    console.log('DTO', resendCodeDto);
    return {
      success: true,
      message: 'Verify code resent successfully',
    };
  }

  async verifyEmail(verifyEmailDto): Promise<ISuccessResponse> {
    const { code, email } = verifyEmailDto;
    const user = await this.userModel.findOne({ email });
    if (user.verificationCode !== code) {
      throw new BadRequestException('Email verification code is invalid');
    }
    user.updateOne({ emailVerified: true, verificationCode: '' });
    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  async forgotPassword(forgotPasswordDto): Promise<ISuccessResponse> {
    console.log('DTO', forgotPasswordDto);
    return {
      success: true,
      message: 'Password reset token has been sent to your email',
    };
  }

  async resetPassword(resetPasswordDto): Promise<ISuccessResponse> {
    const { token, newPassword, confirmPassword } = resetPasswordDto;
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('confirmPassword does not match newPassword');
    }
    const user = await this.userModel.findOne({ passwordResetToken: token });
    if (!user) {
      throw new BadRequestException('Password reset token is invalid');
    }
    user.updateOne({ password: newPassword, passwordResetToken: '' });
    return {
      success: true,
      message: 'Password reset successful',
    };
  }

  async changePassword(id: string, changePasswordDto): Promise<ISuccessResponse> {
    const { oldPassword, newPassword, confirmPassword } = changePasswordDto;
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('confirmPassword does not match newPassword');
    }
    const user = await this.userModel.findById(id);
    const isPasswordMatched = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordMatched) {
      throw new BadRequestException('Old password is incorrect');
    }
    user.updateOne({ password: newPassword });
    return {
      success: true,
      message: 'Password changed successfully',
    };
  }
}
